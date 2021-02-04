import moment from 'moment'
import {flatten, union} from 'lodash'

import DataStore from '../../../common/src/data/datastore'

import {
  AppoinmentBarCodeSequenceDBModel,
  AppointmentAcuityResponse,
  AppointmentAttachTransportStatus,
  AppointmentByOrganizationRequest,
  AppointmentChangeToRerunRequest,
  AppointmentDBModel,
  AppointmentStatus,
  AppointmentStatusHistoryDb,
  CreateAppointmentRequest,
  DeadlineLabel,
  UserAppointment,
  userAppointmentDTOResponse,
  ResultTypes,
} from '../models/appointment'
import {AcuityRepository} from '../respository/acuity.repository'
import {AppointmentsBarCodeSequence} from '../respository/appointments-barcode-sequence'
import {
  AppointmentsRepository,
  StatusHistoryRepository,
} from '../respository/appointments-repository'
import {PCRTestResultsRepository} from '../respository/pcr-test-results-repository'

import {dateFormats, now, timeFormats} from '../../../common/src/utils/times'
import {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import {Config} from '../../../common/src/utils/config'
import {makeDeadline, makeFirestoreTimestamp} from '../utils/datetime.helper'

import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {DuplicateDataException} from '../../../common/src/exceptions/duplicate-data-exception'
import {AvailableTimes} from '../models/available-times'
import {
  decodeBookingLocationId,
  decodeAvailableTimeId,
  encodeAvailableTimeId,
} from '../utils/base64-converter'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

export class AppoinmentService {
  private dataStore = new DataStore()
  private acuityRepository = new AcuityRepository()
  private appointmentsBarCodeSequence = new AppointmentsBarCodeSequence(this.dataStore)
  private appointmentsRepository = new AppointmentsRepository(this.dataStore)
  private pcrTestResultsRepository = new PCRTestResultsRepository(this.dataStore)

  async getAppointmentByBarCode(
    barCodeNumber: string,
    blockDuplicate?: boolean,
  ): Promise<AppointmentDBModel> {
    const shouldBlockDuplicate = blockDuplicate ?? false
    const appointments = await this.appointmentsRepository.findWhereEqual('barCode', barCodeNumber)

    if (appointments.length > 1) {
      console.log(`AdminController: Multiple Appointments with barcode. Barcode: ${barCodeNumber}`)
      if (shouldBlockDuplicate) {
        throw new DuplicateDataException(`Same Barcode used by multiple appointments`)
      }
    }
    if (!appointments || appointments.length == 0) {
      throw new ResourceNotFoundException(`Appointment with barCode ${barCodeNumber} not found`)
    }
    return appointments[0]
  }

  async getAppointmentByBarCodeNullable(
    barCodeNumber: string,
  ): Promise<AppointmentDBModel | false> {
    const appointments = await this.appointmentsRepository.findWhereEqual('barCode', barCodeNumber)
    if (appointments.length > 1) {
      console.log(`AdminController: Multiple Appointments with barcode. Barcode: ${barCodeNumber}`)
    }
    return appointments.length ? appointments[0] : false
  }

  async getAppointmentsDB(
    queryParams: AppointmentByOrganizationRequest,
  ): Promise<AppointmentDBModel[]> {
    const conditions = []
    if (queryParams.organizationId) {
      conditions.push({
        map: '/',
        key: 'organizationId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: queryParams.organizationId,
      })
    }

    if (queryParams.barCode) {
      conditions.push({
        map: '/',
        key: 'barCode',
        operator: DataModelFieldMapOperatorType.Equals,
        value: queryParams.barCode,
      })
    }

    if (queryParams.dateOfAppointment) {
      conditions.push({
        map: '/',
        key: 'dateOfAppointment',
        operator: DataModelFieldMapOperatorType.Equals,
        value: moment(queryParams.dateOfAppointment).format(dateFormats.longMonth),
      })
    }

    if (queryParams.appointmentStatus) {
      conditions.push({
        map: '/',
        key: 'appointmentStatus',
        operator: DataModelFieldMapOperatorType.In,
        value: queryParams.appointmentStatus,
      })
    }

    if (queryParams.transportRunId) {
      conditions.push({
        map: '/',
        key: 'transportRunId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: queryParams.transportRunId,
      })
    }

    if (queryParams.searchQuery) {
      const fullName = queryParams.searchQuery.split(' ')
      const searchPromises = []

      conditions.push({
        map: '/',
        key: 'dateOfAppointment',
        operator: DataModelFieldMapOperatorType.Equals,
        value: moment(queryParams.dateOfAppointment).format(dateFormats.longMonth),
      })
      if (fullName.length === 1) {
        searchPromises.push(
          this.appointmentsRepository.findWhereEqualInMap([
            ...conditions,
            {
              map: '/',
              key: 'firstName',
              operator: DataModelFieldMapOperatorType.Equals,
              value: fullName[0],
            },
          ]),
          this.appointmentsRepository.findWhereEqualInMap([
            ...conditions,
            {
              map: '/',
              key: 'lastName',
              operator: DataModelFieldMapOperatorType.Equals,
              value: fullName[0],
            },
          ]),
        )
      } else {
        searchPromises.push(
          this.appointmentsRepository.findWhereEqualInMap([
            ...conditions,
            {
              map: '/',
              key: 'firstName',
              operator: DataModelFieldMapOperatorType.Equals,
              value: fullName[0],
            },
            {
              map: '/',
              key: 'lastName',
              operator: DataModelFieldMapOperatorType.Equals,
              value: fullName[1],
            },
          ]),
          this.appointmentsRepository.findWhereEqualInMap([
            ...conditions,
            {
              map: '/',
              key: 'firstName',
              operator: DataModelFieldMapOperatorType.Equals,
              value: fullName[1],
            },
            {
              map: '/',
              key: 'lastName',
              operator: DataModelFieldMapOperatorType.Equals,
              value: fullName[0],
            },
          ]),
        )
      }
      const foundAppointments = await Promise.all(searchPromises).then((appointmentsArray) =>
        flatten(appointmentsArray),
      )
      return [
        ...new Map(flatten(foundAppointments).map((item) => [item.id, item])).values(),
      ] as AppointmentDBModel[]
    } else {
      return this.appointmentsRepository.findWhereEqualInMap(conditions)
    }
  }

  async getAppointmentByIdFromAcuity(id: number): Promise<AppointmentAcuityResponse> {
    return this.acuityRepository.getAppointmentByIdFromAcuity(id)
  }

  async getAppointmentDBById(id: string): Promise<AppointmentDBModel> {
    return this.appointmentsRepository.get(id)
  }

  async getAppointmentDBByIdWithCancel(
    id: string,
    isLabUser: boolean,
  ): Promise<AppointmentDBModel & {canCancel: boolean}> {
    const appointment = await this.getAppointmentDBById(id)
    return {
      ...appointment,
      canCancel: this.getCanCancel(isLabUser, appointment.appointmentStatus),
    }
  }

  async getAppointmentsDBByIds(appointmentsIds: string[]): Promise<AppointmentDBModel[]> {
    return this.appointmentsRepository.findWhereIdIn(appointmentsIds)
  }

  async getAppointmentByAcuityId(id: number | string): Promise<AppointmentDBModel> {
    const appointments = await this.appointmentsRepository.findWhereEqual(
      'acuityAppointmentId',
      Number(id),
    )
    if (!appointments || !appointments.length) {
      return null
    }
    if (appointments.length > 1) {
      //CRITICAL
      console.log(
        `AppointmentService: getAppointmentByAcuityId returned multiple appointments AppoinmentID: ${id}`,
      )
    }
    return appointments[0]
  }

  createAppointmentFromAcuity(
    acuityAppointment: AppointmentAcuityResponse,
    additionalData: {
      barCodeNumber: string
      organizationId: string
      appointmentTypeID: number
      calendarID: number
      appointmentStatus: AppointmentStatus
      latestResult: ResultTypes
      couponCode?: string
      userId?: string
    },
  ): Promise<AppointmentDBModel> {
    const data = this.appointmentFromAcuity(acuityAppointment, additionalData)
    return this.appointmentsRepository.save(data)
  }

  updateAppointmentFromAcuity(
    id: string,
    acuityAppointment: AppointmentAcuityResponse,
    additionalData: {
      barCodeNumber: string
      organizationId: string
      appointmentTypeID: number
      calendarID: number
      appointmentStatus: AppointmentStatus
      latestResult: ResultTypes
    },
  ): Promise<AppointmentDBModel> {
    const data = this.appointmentFromAcuity(acuityAppointment, additionalData)
    return this.updateAppointmentDB(id, data)
  }

  private appointmentFromAcuity(
    acuityAppointment: AppointmentAcuityResponse,
    additionalData: {
      barCodeNumber: string
      organizationId: string
      appointmentTypeID: number
      calendarID: number
      appointmentStatus: AppointmentStatus
      latestResult: ResultTypes
      couponCode?: string
      userId?: string
    },
  ): Omit<AppointmentDBModel, 'id'> {
    const utcDateTime = moment(acuityAppointment.datetime).utc()
    const dateTimeTz = moment(acuityAppointment.datetime).tz(timeZone)

    const dateTime = utcDateTime.format()
    const dateOfAppointment = dateTimeTz.format(dateFormats.longMonth)
    const timeOfAppointment = dateTimeTz.format(timeFormats.standard12h)
    const label = acuityAppointment.labels ? acuityAppointment.labels[0]?.name : null
    const deadline = makeDeadline(utcDateTime, label)
    const {
      barCodeNumber,
      organizationId,
      appointmentTypeID,
      calendarID,
      appointmentStatus,
      latestResult,
      couponCode = '',
      userId = '',
    } = additionalData
    const barCode = acuityAppointment.barCode || barCodeNumber

    return {
      acuityAppointmentId: acuityAppointment.id,
      appointmentStatus,
      appointmentTypeID,
      barCode: barCode,
      canceled: acuityAppointment.canceled,
      calendarID,
      dateOfAppointment,
      dateOfBirth: acuityAppointment.dateOfBirth,
      dateTime,
      deadline,
      email: acuityAppointment.email,
      firstName: acuityAppointment.firstName,
      lastName: acuityAppointment.lastName,
      location: acuityAppointment.location,
      organizationId: acuityAppointment.organizationId || organizationId || null,
      packageCode: acuityAppointment.certificate,
      phone: acuityAppointment.phone,
      registeredNursePractitioner: acuityAppointment.registeredNursePractitioner,
      latestResult,
      timeOfAppointment,
      additionalAddressNotes: acuityAppointment.additionalAddressNotes,
      address: acuityAppointment.address,
      addressForTesting: acuityAppointment.addressForTesting,
      addressUnit: acuityAppointment.addressUnit,
      travelID: acuityAppointment.travelID,
      travelIDIssuingCountry: acuityAppointment.travelIDIssuingCountry,
      ohipCard: acuityAppointment.ohipCard ?? '',
      swabMethod: acuityAppointment.swabMethod,
      readTermsAndConditions: acuityAppointment.readTermsAndConditions,
      receiveNotificationsFromGov: acuityAppointment.receiveNotificationsFromGov,
      receiveResultsViaEmail: acuityAppointment.receiveResultsViaEmail,
      shareTestResultWithEmployer: acuityAppointment.shareTestResultWithEmployer,
      couponCode,
      userId,
    }
  }

  async getNextBarCodeNumber(): Promise<string> {
    return this.appointmentsBarCodeSequence
      .getNextBarCode()
      .then(({id, barCodeNumber}: AppoinmentBarCodeSequenceDBModel) => {
        return id.concat(barCodeNumber.toString())
      })
  }

  async updateAppointment(id: number, data: unknown): Promise<AppointmentAcuityResponse> {
    return this.acuityRepository.updateAppointmentOnAcuity(id, data)
  }

  async cancelAppointment(
    appointmentId: string,
    userId: string,
    isLabUser: boolean,
    organizationId?: string,
  ): Promise<void> {
    const appointmentFromDB = await this.getAppointmentDBById(appointmentId)
    if (!appointmentFromDB) {
      console.log(
        `AppoinmentService: cancelAppointment AppointmentIDFromDB: "${appointmentId}" not found`,
      )
      throw new ResourceNotFoundException(`Invalid Appointment ID`)
    }

    const canCancel = this.getCanCancel(isLabUser, appointmentFromDB.appointmentStatus)

    if (!canCancel) {
      console.warn(
        `cancelAppointment: Failed for appointmentId ${appointmentId} isLabUser: ${isLabUser} appointmentStatus: ${appointmentFromDB.appointmentStatus}`,
      )
      throw new BadRequestException(
        `Appointment can't be cancelled. It is already in ${appointmentFromDB.appointmentStatus} state`,
      )
    }

    if (organizationId && appointmentFromDB.organizationId !== organizationId) {
      console.log(
        `OrganizationId "${organizationId}" does not match appointment "${appointmentId}"`,
      )
      throw new BadRequestException(`Appointment doesn't belong to selected Organization`)
    }

    const appointmentFromAcuity = await this.getAppointmentByIdFromAcuity(
      appointmentFromDB.acuityAppointmentId,
    )
    if (!appointmentFromAcuity) {
      //CRITICAL
      console.log(
        `OrganizationId "AppoinmentService: cancelAppointment AppointmentIDFromAcuity: "${appointmentFromDB.acuityAppointmentId}" not found. CRITICAL`,
      )
      throw new ResourceNotFoundException(`Something is wrong. Please contact Admin.`)
    }

    const appointmentStatus = await this.acuityRepository.cancelAppointmentByIdOnAcuity(
      appointmentFromDB.acuityAppointmentId,
    )
    if (appointmentStatus.canceled) {
      console.log(
        `AppoinmentService: cancelAppointment AppointmentIDFromAcuity: "${appointmentFromDB.acuityAppointmentId}" is successfully cancelled`,
      )
      //Update Appointment DB to be Cancelled
      await this.makeCancelled(appointmentId, userId)
      try {
        const pcrTestResult = await this.pcrTestResultsRepository.getWaitingPCRResultsByAppointmentId(
          appointmentFromDB.id,
        )
        if (pcrTestResult) {
          //Remove any Results
          //Only one Waiting Result is Expected
          await this.pcrTestResultsRepository.delete(pcrTestResult[0].id)
        } else {
          console.log(
            `AppoinmentService:cancelAppointment:FailedDeletePCRResults No PCR Results linked to AppointmentIDFromDB: "${appointmentFromDB.id}"`,
          )
        }
      } catch (error) {
        console.log(
          `AppoinmentService:cancelAppointment:FailedDeletePCRResults linked to AppointmentIDFromDB: "${
            appointmentFromDB.id
          }" ${error.toString()}`,
        )
      }
    }
  }

  private getStatusHistoryRepository(appointmentId: string) {
    return new StatusHistoryRepository(this.dataStore, appointmentId)
  }

  async addStatusHistoryById(
    appointmentId: string,
    newStatus: AppointmentStatus,
    createdBy: string,
  ): Promise<AppointmentStatusHistoryDb> {
    const appointment = await this.getAppointmentDBById(appointmentId)
    return this.getStatusHistoryRepository(appointmentId).add({
      newStatus: newStatus,
      previousStatus: appointment.appointmentStatus,
      createdOn: now(),
      createdBy,
    })
  }

  async makeCancelled(appointmentId: string, userId: string): Promise<AppointmentDBModel> {
    await this.addStatusHistoryById(appointmentId, AppointmentStatus.InProgress, userId)
    return this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.Canceled,
      cancelled: true,
    })
  }

  async makeInProgress(
    appointmentId: string,
    testRunId: string,
    userId: string,
  ): Promise<AppointmentDBModel> {
    await this.addStatusHistoryById(appointmentId, AppointmentStatus.InProgress, userId)
    return this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.InProgress,
      testRunId,
    })
  }

  async makeReceived(
    appointmentId: string,
    vialLocation: string,
    userId: string,
  ): Promise<AppointmentDBModel> {
    await this.addStatusHistoryById(appointmentId, AppointmentStatus.Received, userId)
    return this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.Received,
      vialLocation,
    })
  }

  async addTransportRun(
    appointmentId: string,
    transportRunId: string,
    userId: string,
  ): Promise<AppointmentAttachTransportStatus> {
    try {
      await this.addStatusHistoryById(appointmentId, AppointmentStatus.InTransit, userId)

      await this.appointmentsRepository.updateProperties(appointmentId, {
        transportRunId: transportRunId,
        appointmentStatus: AppointmentStatus.InTransit,
      })
      return AppointmentAttachTransportStatus.Succeed
    } catch (e) {
      return AppointmentAttachTransportStatus.Failed
    }
  }

  async addAppointmentLabel(id: number, label: DeadlineLabel): Promise<AppointmentDBModel> {
    const appointment = await this.getAppointmentByAcuityId(id)
    const deadline = makeDeadline(moment(appointment.dateTime).tz(timeZone).utc(), label)
    await this.acuityRepository.addAppointmentLabelOnAcuity(id, label)

    return this.updateAppointmentDB(appointment.id, {deadline})
  }

  async updateAppointmentDB(
    id: string,
    data: Partial<AppointmentDBModel>,
  ): Promise<AppointmentDBModel> {
    return this.appointmentsRepository.updateProperties(id, data)
  }

  async changeStatusToReRunRequired(
    data: AppointmentChangeToRerunRequest,
  ): Promise<AppointmentDBModel> {
    const utcDateTime = moment(data.appointment.dateTime).utc()
    const deadline = makeDeadline(utcDateTime, data.deadlineLabel)
    await this.addStatusHistoryById(
      data.appointment.id,
      AppointmentStatus.ReRunRequired,
      data.userId,
    )
    await this.acuityRepository.addAppointmentLabelOnAcuity(
      data.appointment.acuityAppointmentId,
      data.deadlineLabel,
    )
    return this.appointmentsRepository.updateProperties(data.appointment.id, {
      appointmentStatus: AppointmentStatus.ReRunRequired,
      deadline: deadline,
    })
  }

  async changeStatusToReSampleRequired(
    appointmentId: string,
    userId: string,
  ): Promise<AppointmentDBModel> {
    await this.addStatusHistoryById(appointmentId, AppointmentStatus.ReSampleRequired, userId)
    return this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.ReSampleRequired,
    })
  }

  async changeStatusToReported(appointmentId: string, userId: string): Promise<AppointmentDBModel> {
    await this.addStatusHistoryById(appointmentId, AppointmentStatus.Reported, userId)
    return this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.Reported,
    })
  }

  async getAppointmentDBByPackageCode(packageCode: string): Promise<AppointmentDBModel[]> {
    return this.appointmentsRepository.findWhereEqual('packageCode', packageCode)
  }

  async createAcuityAppointment({
    slotId,
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    address,
    addressUnit,
    addressForTesting,
    additionalAddressNotes,
    couponCode,
    shareTestResultWithEmployer,
    readTermsAndConditions,
    agreeToConductFHHealthAssessment,
    receiveResultsViaEmail,
    receiveNotificationsFromGov,
    organizationId,
    userId,
  }: CreateAppointmentRequest): Promise<void> {
    let slotData

    try {
      slotData = JSON.parse(Buffer.from(slotId, 'base64').toString())
    } catch (error) {
      throw new BadRequestException('Invalid Id')
    }

    const {time, appointmentTypeId, calendarId} = decodeAvailableTimeId(slotData)
    const utcDateTime = moment(time).utc()

    const dateTime = utcDateTime.format()
    const data = await this.acuityRepository.createAppointment(
      dateTime,
      appointmentTypeId,
      firstName,
      lastName,
      email,
      `${phone.code}${phone.number}`,
      '',
      {
        dateOfBirth,
        address,
        addressUnit,
        addressForTesting,
        additionalAddressNotes,
        shareTestResultWithEmployer,
        readTermsAndConditions,
        agreeToConductFHHealthAssessment,
        receiveResultsViaEmail,
        receiveNotificationsFromGov,
      },
    )
    await this.createAppointmentFromAcuity(data, {
      barCodeNumber: await this.getNextBarCodeNumber(),
      appointmentTypeID: appointmentTypeId,
      calendarID: calendarId,
      appointmentStatus: AppointmentStatus.Pending,
      latestResult: ResultTypes.Pending,
      organizationId,
      couponCode,
      userId,
    })
  }

  async getAvailabitlityDateList(
    id: string,
    year: number,
    month: number,
  ): Promise<{date: string}[]> {
    const {appointmentTypeId, calendarTimezone, calendarId} = decodeBookingLocationId(id)

    return this.acuityRepository.getAvailabilityDates(
      appointmentTypeId,
      `${year}-${month}`,
      calendarId,
      calendarTimezone,
    )
  }

  async getAvailableSlots(id: string, date: string): Promise<AvailableTimes[]> {
    const {
      appointmentTypeId,
      calendarTimezone,
      calendarId,
      organizationId,
      packageCode,
    } = decodeBookingLocationId(id)

    const slotsList = await this.acuityRepository.getAvailableSlots(
      appointmentTypeId,
      date,
      calendarId,
      calendarTimezone,
    )

    return slotsList.map(({time, slotsAvailable}) => {
      const idBuf = {
        appointmentTypeId,
        calendarTimezone,
        calendarId,
        date,
        time,
        organizationId,
        packageCode,
      }
      const id = encodeAvailableTimeId(idBuf)

      return {
        id,
        label: moment(time).tz(calendarTimezone).format(timeFormats.standard12h),
        slotsAvailable: slotsAvailable,
      }
    })
  }

  getCanCancel(isLabUser: boolean, appointmentStatus: AppointmentStatus): boolean {
    return (
      (!isLabUser && appointmentStatus === AppointmentStatus.Pending) ||
      (isLabUser &&
        appointmentStatus !== AppointmentStatus.Canceled &&
        appointmentStatus !== AppointmentStatus.Reported &&
        appointmentStatus !== AppointmentStatus.ReSampleRequired)
    )
  }

  async checkDuplicatedAppointments(appointmentIds: string[]): Promise<void> {
    const appointments = await this.getAppointmentsDBByIds(appointmentIds)
    const barCodes = appointments.map(({barCode}) => barCode)

    if (union(barCodes).length != barCodes.length) {
      const firstMatch = new Set()
      const duplicatedBarCodes = new Set()

      barCodes.forEach((barcode) => {
        if (!firstMatch.has(barcode)) {
          return firstMatch.add(barcode)
        }
        duplicatedBarCodes.add(barcode)
      })
      const duplicatedBarCodeArray = Array.from(duplicatedBarCodes.keys())
      const duplicatedAppointmentIds = appointments
        .filter(({barCode}) => duplicatedBarCodeArray.includes(barCode))
        .map(({id}) => id)

      throw new DuplicateDataException(
        `Multiple Appointments [${duplicatedAppointmentIds}] with barcodes: ${duplicatedBarCodeArray}`,
      )
    }
  }

  async getAppointmentByUserId(userId: string): Promise<UserAppointment[]> {
    const appointmentResultsQuery = [
      {
        map: '/',
        key: 'deadline',
        operator: DataModelFieldMapOperatorType.GreatOrEqual,
        value: makeFirestoreTimestamp(moment().toDate()),
      },
      {
        map: '/',
        key: 'userId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: userId,
      },
    ]

    const appointments = await this.appointmentsRepository.findWhereEqualInMap(
      appointmentResultsQuery,
    )

    return appointments.map(userAppointmentDTOResponse)
  }

  async regenerateBarCode(appointmentId: string): Promise<AppointmentDBModel> {
    const appointment = await this.appointmentsRepository.get(appointmentId)

    if (!appointment) {
      throw new BadRequestException('Invalid appointmentId')
    }
    const newBarCode = await this.getNextBarCodeNumber()
    console.log(`regenerateBarCode: AppointmentID: ${appointmentId} New BarCode: ${newBarCode}`)

    const updatedAppoinment = await this.appointmentsRepository.updateBarCodeById(
      appointmentId,
      newBarCode,
    )
    const pcrTest = await this.pcrTestResultsRepository.findWhereEqual(
      'appointmentId',
      appointmentId,
    )

    if (pcrTest.length) {
      pcrTest.forEach(async (pcrTest) => {
        await this.pcrTestResultsRepository.updateData(pcrTest.id, {barCode: newBarCode})
        console.log(`regenerateBarCode: PCRTestID: ${pcrTest.id} New BarCode: ${newBarCode}`)
      })
    } else {
      console.warn(`Not found PCR-test-result with appointmentId: ${appointmentId}`)
    }

    return updatedAppoinment
  }
}
