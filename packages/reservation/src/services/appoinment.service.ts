import moment from 'moment'
import {flatten, union, fromPairs} from 'lodash'

import DataStore from '../../../common/src/data/datastore'

import {
  AppoinmentBarCodeSequenceDBModel,
  AppointmentAcuityResponse,
  AppointmentByOrganizationRequest,
  AppointmentChangeToRerunRequest,
  AppointmentDBModel,
  AppointmentStatus,
  AppointmentStatusHistoryDb,
  CreateAppointmentRequest,
  DeadlineLabel,
  ResultTypes,
  UserAppointment,
  userAppointmentDTOResponse,
  AppointmentActivityAction,
  Filter,
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
import {
  firestoreTimeStampToUTC,
  makeDeadline,
  makeFirestoreTimestamp,
} from '../utils/datetime.helper'

import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {DuplicateDataException} from '../../../common/src/exceptions/duplicate-data-exception'
import {AvailableTimes} from '../models/available-times'
import {
  decodeBookingLocationId,
  decodeAvailableTimeId,
  encodeAvailableTimeId,
} from '../utils/base64-converter'
import {Enterprise} from '../adapter/enterprise'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'
import {
  AppointmentBulkAction,
  BulkData,
  BulkOperationResponse,
  BulkOperationStatus,
} from '../types/bulk-operation.type'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

export class AppoinmentService {
  private dataStore = new DataStore()
  private acuityRepository = new AcuityRepository()
  private appointmentsBarCodeSequence = new AppointmentsBarCodeSequence(this.dataStore)
  private appointmentsRepository = new AppointmentsRepository(this.dataStore)
  private pcrTestResultsRepository = new PCRTestResultsRepository(this.dataStore)
  private organizationService = new OrganizationService()
  private enterpriseAdapter = new Enterprise()

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
  ): Promise<(AppointmentDBModel & {organizationName: string})[]> {
    const conditions = []
    let appointments = []
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
      appointments = [
        ...new Map(flatten(foundAppointments).map((item) => [item.id, item])).values(),
      ] as AppointmentDBModel[]
    } else {
      appointments = await this.appointmentsRepository.findWhereEqualInMap(conditions)
    }
    const organizations = fromPairs(
      (
        await this.organizationService.getAllByIds(
          appointments
            .map((appointment: AppointmentDBModel) => appointment.organizationId)
            .filter((orgId) => !!orgId),
        )
      ).map((organization) => [organization.id, organization.name]),
    )

    return appointments.map((appointment) => ({
      ...appointment,
      organizationName: organizations[appointment.organizationId],
    }))
  }

  async getAppointmentByIdFromAcuity(id: number): Promise<AppointmentAcuityResponse> {
    return this.acuityRepository.getAppointmentByIdFromAcuity(id)
  }

  async getAppointmentDBById(id: string): Promise<AppointmentDBModel & {organizationName: string}> {
    const appointment = await this.appointmentsRepository.get(id)
    const organization = await this.organizationService.findOneById(appointment.organizationId)
    return {
      ...appointment,
      organizationName: organization && organization.name,
    }
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

  async createAppointmentFromAcuity(
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
    const data = await this.appointmentFromAcuity(acuityAppointment, additionalData)
    return this.appointmentsRepository.save(data)
  }

  async updateAppointmentFromAcuity(
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
    const data = await this.appointmentFromAcuity(acuityAppointment, additionalData)
    return this.updateAppointmentDB(id, data, AppointmentActivityAction.UpdateFromAcuity)
  }

  private async appointmentFromAcuity(
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
  ): Promise<Omit<AppointmentDBModel, 'id'>> {
    const dateTime = makeFirestoreTimestamp(acuityAppointment.datetime)
    const dateTimeTz = moment(acuityAppointment.datetime).tz(timeZone)
    const dateOfAppointment = dateTimeTz.format(dateFormats.longMonth)
    const timeOfAppointment = dateTimeTz.format(timeFormats.standard12h)
    const label = acuityAppointment.labels ? acuityAppointment.labels[0]?.name : null
    const utcDateTime = moment(acuityAppointment.datetime).utc()
    const deadline = makeDeadline(utcDateTime, label)
    const {
      barCodeNumber,
      organizationId,
      appointmentTypeID,
      calendarID,
      appointmentStatus,
      latestResult,
      couponCode = '',
      userId,
    } = additionalData
    const barCode = acuityAppointment.barCode || barCodeNumber
    const promises = []

    promises.push(this.acuityRepository.getCalendarList())

    if (!userId) {
      promises.push(
        this.enterpriseAdapter.findOrCreateUser({
          email: acuityAppointment.email,
          firstName: acuityAppointment.firstName,
          lastName: acuityAppointment.lastName,
          organizationId: acuityAppointment.organizationId || '',
        }),
      )
    }

    const [calendars, userIdFromDb] = await Promise.all(promises)

    const appoinmentCalendar = calendars.find(({id}) => id === acuityAppointment.calendarID)
    const currentUserId = userId ? userId : userIdFromDb.data.id

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
      address: acuityAppointment.address,
      addressUnit: acuityAppointment.addressUnit,
      travelID: acuityAppointment.travelID,
      travelIDIssuingCountry: acuityAppointment.travelIDIssuingCountry,
      ohipCard: acuityAppointment.ohipCard ?? '',
      swabMethod: acuityAppointment.swabMethod,
      readTermsAndConditions: acuityAppointment.readTermsAndConditions,
      receiveNotificationsFromGov: acuityAppointment.receiveNotificationsFromGov,
      receiveResultsViaEmail: acuityAppointment.receiveResultsViaEmail,
      shareTestResultWithEmployer: acuityAppointment.shareTestResultWithEmployer,
      agreeToConductFHHealthAssessment: acuityAppointment.agreeToConductFHHealthAssessment,
      couponCode,
      userId: currentUserId,
      locationName: appoinmentCalendar?.name,
      locationAddress: appoinmentCalendar?.location,
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
        `Appointment can't be canceled. It is already in ${appointmentFromDB.appointmentStatus} state`,
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
        `AppoinmentService: cancelAppointment AppointmentIDFromAcuity: "${appointmentFromDB.acuityAppointmentId}" is successfully canceled`,
      )
      //Update Appointment DB to be Canceled
      await this.makeCanceled(appointmentId, userId)
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
    console.log(appointmentId)
    return this.getStatusHistoryRepository(appointmentId).add({
      newStatus: newStatus,
      previousStatus: appointment.appointmentStatus,
      createdOn: now(),
      createdBy,
    })
  }

  async makeCanceled(appointmentId: string, userId: string): Promise<AppointmentDBModel> {
    await this.addStatusHistoryById(appointmentId, AppointmentStatus.InProgress, userId)
    return this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.Canceled,
      canceled: true,
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

  async makeBulkAction(
    appointmentId: string,
    data: BulkData,
    actionType: AppointmentBulkAction,
  ): Promise<BulkOperationResponse> {
    try {
      const appointment = await this.appointmentsRepository.findOneById(appointmentId)
      const result = this.checkAppointmentStatus(appointmentId, appointment)

      if (result) {
        return result
      }

      switch (actionType) {
        case AppointmentBulkAction.MakeRecived:
          await this.makeReceived(appointmentId, data.vialLocation, data.userId)
          break

        case AppointmentBulkAction.AddTransportRun:
          await this.addTransportRun(appointmentId, data.transportRunId, data.userId)
          break

        case AppointmentBulkAction.AddAppointmentLabel:
          await this.addAppointmentLabel(appointment, data.label)
          break

        default:
          console.warn('Wrong bulk action type')
      }

      return {
        id: appointmentId,
        barCode: appointment.barCode,
        status: BulkOperationStatus.Success,
      }
    } catch (error) {
      console.warn(`[${actionType} bulk update error]: ${error.message}`)
      return {
        id: appointmentId,
        status: BulkOperationStatus.Failed,
        reason: 'Internal server error',
      }
    }
  }

  async makeReceived(appointmentId: string, vialLocation: string, userId: string): Promise<void> {
    await this.addStatusHistoryById(appointmentId, AppointmentStatus.Received, userId)

    await this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.Received,
      vialLocation,
    })
  }

  async addTransportRun(
    appointmentId: string,
    transportRunId: string,
    userId: string,
  ): Promise<void> {
    await this.addStatusHistoryById(appointmentId, AppointmentStatus.InTransit, userId)

    await this.appointmentsRepository.updateProperties(appointmentId, {
      transportRunId: transportRunId,
      appointmentStatus: AppointmentStatus.InTransit,
    })
  }

  private async checkAppointmentStatusOnly(
    appointmentId: string,
    appointmentStatus: AppointmentStatus,
  ) {
    const appointment = await this.getAppointmentDBById(appointmentId)

    return appointment && appointment.appointmentStatus === appointmentStatus
  }

  private checkAppointmentStatus(
    id: string,
    appointment: AppointmentDBModel,
  ): BulkOperationResponse {
    if (!appointment) {
      return {
        id,
        status: BulkOperationStatus.Failed,
        reason: "Doesn't exist in DB",
      }
    } else if (
      appointment.appointmentStatus === AppointmentStatus.Canceled ||
      appointment.appointmentStatus === AppointmentStatus.Reported
    ) {
      return {
        id,
        status: BulkOperationStatus.Failed,
        barCode: appointment.barCode,
        reason: 'This action not allowed for apointments with Canceled or Reported status',
      }
    }
  }

  async addAppointmentLabel(appointment: AppointmentDBModel, label: DeadlineLabel): Promise<void> {
    const deadline = makeDeadline(moment(appointment.dateTime.toDate()).utc(), label)
    await this.acuityRepository.addAppointmentLabelOnAcuity(appointment.acuityAppointmentId, label)

    const pcrResult = await this.pcrTestResultsRepository.getTestResultByAppointmentId(
      appointment.id,
    )
    // Throws en exception, in case of result not found

    await Promise.all([
      this.pcrTestResultsRepository.updateData(pcrResult.id, {
        deadline: deadline,
      }),
      this.updateAppointmentDB(appointment.id, {deadline}),
    ])
  }

  async updateAppointmentDB(
    id: string,
    updates: Partial<AppointmentDBModel>,
    action?: AppointmentActivityAction,
  ): Promise<AppointmentDBModel> {
    return this.appointmentsRepository.updateAppointment({id, updates, action})
  }

  async changeStatusToReRunRequired(
    data: AppointmentChangeToRerunRequest,
  ): Promise<AppointmentDBModel> {
    const utcDateTime = firestoreTimeStampToUTC(data.appointment.dateTime)
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

  async changeStatusToReCollectRequired(
    appointmentId: string,
    userId: string,
  ): Promise<AppointmentDBModel> {
    await this.addStatusHistoryById(appointmentId, AppointmentStatus.ReCollectRequired, userId)
    return this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.ReCollectRequired,
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
    couponCode,
    shareTestResultWithEmployer,
    readTermsAndConditions,
    agreeToConductFHHealthAssessment,
    receiveResultsViaEmail,
    receiveNotificationsFromGov,
    organizationId,
    userId,
    packageCode,
  }: CreateAppointmentRequest & {email: string}): Promise<AppointmentDBModel> {
    const {time, appointmentTypeId, calendarId} = decodeAvailableTimeId(slotId)
    const utcDateTime = moment(time).utc()

    const dateTime = utcDateTime.format()
    const data = await this.acuityRepository.createAppointment(
      dateTime,
      appointmentTypeId,
      firstName,
      lastName,
      email,
      `${phone.code}${phone.number}`,
      packageCode,
      calendarId,
      {
        dateOfBirth,
        address,
        addressUnit,
        shareTestResultWithEmployer,
        readTermsAndConditions,
        agreeToConductFHHealthAssessment,
        receiveResultsViaEmail,
        receiveNotificationsFromGov,
      },
    )
    return this.createAppointmentFromAcuity(data, {
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
        appointmentStatus !== AppointmentStatus.ReCollectRequired)
    )
  }

  async checkDuplicatedAndMissedAppointments(
    appointmentIds: string[],
  ): Promise<{
    failed: BulkOperationResponse[]
    filtredAppointmentIds: string[]
  }> {
    const appointments = await this.getAppointmentsDBByIds(appointmentIds)
    const appointmentIdsFromDb = []
    const barCodes = appointments.map(({barCode, id}) => {
      appointmentIdsFromDb.push(id)

      return barCode
    })
    const appointmentsByBarCodes = await this.appointmentsRepository.findWhereIn(
      'barCode',
      barCodes,
    )
    const allBarCodes = appointmentsByBarCodes.map(({barCode}) => barCode)
    const failed: BulkOperationResponse[] = []

    appointmentIds.filter((id) => {
      if (!appointmentIdsFromDb.includes(id)) {
        failed.push({
          id,
          status: BulkOperationStatus.Failed,
          reason: "Doesn't exist in DB",
        })
      }
    })

    const firstBarCodeMatch = new Map()
    const hasDuplicates = union(allBarCodes).length != allBarCodes.length
    const hasMissed = appointmentIds.length !== appointmentIdsFromDb.length
    if (hasDuplicates || hasMissed) {
      appointmentsByBarCodes.forEach(({barCode, id}) => {
        if (!firstBarCodeMatch.has(barCode)) {
          return firstBarCodeMatch.set(barCode, {barCode, id})
        }
        failed.push({
          id,
          barCode,
          status: BulkOperationStatus.Failed,
          reason: 'Duplicate barcodes',
        })
      })
    }

    const filtredAppointmentIds: string[] =
      hasDuplicates || hasMissed
        ? Array.from(firstBarCodeMatch.values()).map(({id}) => id)
        : appointmentIds

    return {
      failed,
      filtredAppointmentIds,
    }
  }

  async getAppointmentByUserId(userId: string): Promise<UserAppointment[]> {
    const appointments = await this.appointmentsRepository.findWhereEqual('userId', userId)

    return appointments.map(userAppointmentDTOResponse)
  }

  async regenerateBarCode(appointmentId: string, userId: string): Promise<AppointmentDBModel> {
    const appointment = await this.appointmentsRepository.get(appointmentId)

    if (!appointment) {
      throw new BadRequestException('Invalid appointmentId')
    }

    if (
      appointment.appointmentStatus === AppointmentStatus.Canceled ||
      appointment.appointmentStatus === AppointmentStatus.Reported
    ) {
      throw new BadRequestException(
        'Forbidden to regenerate barCode for apointment with status "Canceled" or "Reported"',
      )
    }

    const newBarCode = await this.getNextBarCodeNumber()
    console.log(
      `regenerateBarCode: AppointmentID: ${appointmentId} OldBarCode: ${appointment.barCode} NewBarCode: ${newBarCode}`,
    )

    const appointmentDataAcuity = await this.updateAppointment(appointment.acuityAppointmentId, {
      barCodeNumber: newBarCode,
    })
    if (appointmentDataAcuity.barCode === newBarCode) {
      console.log(
        `regenerateBarCode: AppointmentID: ${appointmentId} AcuityID: ${appointment.acuityAppointmentId} successfully updated`,
      )
    }

    const updatedAppoinment = await this.appointmentsRepository.updateBarCodeById(
      appointmentId,
      newBarCode,
      userId,
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

  async getAppointmentsStats(
    appointmentStatus: AppointmentStatus[],
    barCode: string,
    organizationId: string,
    dateOfAppointment: string,
    searchQuery: string,
    transportRunId: string,
  ): Promise<{
    appointmentStatusArray: Filter[]
    orgIdArray: Filter[]
    total: number
  }> {
    const appointments = await this.getAppointmentsDB({
      appointmentStatus,
      barCode,
      organizationId,
      dateOfAppointment,
      searchQuery,
      transportRunId,
    })
    const appointmentStatsByTypes: Record<AppointmentStatus, number> = {} as Record<
      AppointmentStatus,
      number
    >
    const appointmentStatsByOrganization: Record<string, number> = {}

    appointments.forEach((appointment) => {
      if (appointmentStatsByTypes[appointment.appointmentStatus]) {
        ++appointmentStatsByTypes[appointment.appointmentStatus]
        ++appointmentStatsByOrganization[appointment.organizationId]
      } else {
        appointmentStatsByTypes[appointment.appointmentStatus] = 1
        appointmentStatsByOrganization[appointment.organizationId] = 1
      }
    })
    const organizations = await this.organizationService.getAllByIds(
      Object.keys(appointmentStatsByOrganization),
    )
    const appointmentStatsByTypesArr = Object.entries(appointmentStatsByTypes).map(
      ([name, count]) => ({
        id: name,
        name,
        count,
      }),
    )
    const appointmentStatsByOrgIdArr = Object.entries(appointmentStatsByOrganization).map(
      ([orgId, count]) => ({
        id: orgId,
        name: organizations.find(({id}) => id === orgId)?.name ?? 'None',
        count,
      }),
    )
    return {
      appointmentStatusArray: appointmentStatsByTypesArr,
      orgIdArray: appointmentStatsByOrgIdArr,
      total: appointments.length,
    }
  }

  async makeCheckIn(appointmentId: string, userId: string): Promise<AppointmentDBModel> {
    if (!(await this.checkAppointmentStatusOnly(appointmentId, AppointmentStatus.Pending))) {
      throw new BadRequestException('Appointment status should be on Pending state')
    }
    await this.addStatusHistoryById(appointmentId, AppointmentStatus.CheckedIn, userId)

    return this.appointmentsRepository.changeAppointmentStatus(
      appointmentId,
      AppointmentStatus.CheckedIn,
    )
  }
}
