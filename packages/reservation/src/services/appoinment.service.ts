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
  CreateAppointmentRequest,
  DeadlineLabel,
  ResultTypes,
  UserAppointment,
  userAppointmentDTOResponse,
  AppointmentActivityAction,
  Filter,
  TestTypes,
  RescheduleAppointmentDTO,
  UpdateTransPortRun,
  Gender,
} from '../models/appointment'

import {dateFormats, timeFormats} from '../../../common/src/utils/times'
import {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import {Config} from '../../../common/src/utils/config'
import {OPNPubSub} from '../../../common/src/service/google/pub_sub'
import {LogError, LogInfo, LogWarning} from '../../../common/src/utils/logging-setup'
import {OPNCloudTasks} from '../../../common/src/service/google/cloud_tasks'

import {
  firestoreTimeStampToUTC,
  makeDeadline,
  makeRapidDeadline,
  makeFirestoreTimestamp,
  getTimeFromFirestoreDateTime,
  makeDefaultIsoDate,
  getFirestoreTimeStampDate,
} from '../utils/datetime.helper'

import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {DuplicateDataException} from '../../../common/src/exceptions/duplicate-data-exception'
import {safeTimestamp} from '../../../common/src/utils/datetime-util'

import {AvailableTimes} from '../models/available-times'
import {
  decodeBookingLocationId,
  decodeAvailableTimeId,
  encodeAvailableTimeId,
} from '../utils/base64-converter'
import {Enterprise} from '../adapter/enterprise'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'
import {UserAddressService} from '../../../enterprise/src/services/user-address-service'
import {LabService} from './lab.service'

//Models
import {
  AppointmentBulkAction,
  BulkData,
  BulkOperationResponse,
  BulkOperationStatus,
} from '../types/bulk-operation.type'
import {ReservationPushTypes} from '../types/appointment-push'
import {DbBatchAppointments} from '../../../common/src/types/push-notification'
import {PcrResultTestActivityAction} from '../models/pcr-test-results'
import {AdminScanHistory} from '../models/admin-scan-history'
import {CardItemDBModel} from '../../../../services-v2/apps/cart-service/src/model'

//Repository
import {AcuityRepository} from '../respository/acuity.repository'
import {AdminScanHistoryRepository} from '../respository/admin-scan-history'
import {AppointmentsBarCodeSequence} from '../respository/appointments-barcode-sequence'
import {AppointmentsRepository} from '../respository/appointments-repository'
import {PCRTestResultsRepository} from '../respository/pcr-test-results-repository'
import {AppointmentToTestTypeRepository} from '../respository/appointment-to-test-type-association.repository'
import {CouponRepository} from '../respository/coupon.repository'

import {AppointmentTypes} from '../models/appointment-types'
import {PackageService} from './package.service'
import {firestore} from 'firebase-admin'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

export class AppoinmentService {
  private dataStore = new DataStore()
  private acuityRepository = new AcuityRepository()
  private appointmentsBarCodeSequence = new AppointmentsBarCodeSequence()
  private appointmentsRepository = new AppointmentsRepository(this.dataStore)
  private pcrTestResultsRepository = new PCRTestResultsRepository(this.dataStore)
  private adminScanHistoryRepository = new AdminScanHistoryRepository(this.dataStore)
  private appointmentToTestTypeRepository = new AppointmentToTestTypeRepository(this.dataStore)
  private couponRepository = new CouponRepository(this.dataStore)

  private organizationService = new OrganizationService()
  private userAddressService = new UserAddressService()
  private labService = new LabService()
  private packageService = new PackageService()
  private enterpriseAdapter = new Enterprise()
  private pubsub = new OPNPubSub(Config.get('TEST_APPOINTMENT_TOPIC'))
  private cloudTasks = new OPNCloudTasks('acuity-appointments-sync')
  private postPubsub(appointment: AppointmentDBModel, action: string): void {
    if (Config.get('APPOINTMENTS_PUB_SUB_NOTIFY') !== 'enabled') {
      LogInfo('AppoinmentService:postPubsub', 'PubSubDisabled', {})
      return
    }
    const attrs = appointment.organizationId
      ? {
          userId: appointment.userId,
          organizationId: appointment.organizationId,
          actionType: action,
        }
      : {
          userId: appointment.userId,
          actionType: action,
        }
    this.pubsub.publish(
      {
        id: appointment.id,
        status: appointment.appointmentStatus,
        date: safeTimestamp(appointment.dateTime).toISOString(),
        testType: appointment.testType,
      },
      attrs,
    )
  }

  async makeDeadlineRapidMinutes(
    appointment: AppointmentDBModel,
    adminId: string,
  ): Promise<AppointmentDBModel> {
    const updatedAppointment = await this.appointmentsRepository.setDeadlineDate(
      appointment.id,
      makeRapidDeadline(),
    )
    await this.pcrTestResultsRepository.updateAllResultsForAppointmentId(
      appointment.id,
      {
        deadline: updatedAppointment.deadline,
        deadlineDate: getFirestoreTimeStampDate(updatedAppointment.deadline),
      },
      PcrResultTestActivityAction.UpdateFromAppointment,
      adminId,
    )
    return updatedAppointment
  }

  async checkDuplicatedScanHistory(adminId: string, appointmentId: string): Promise<void> {
    const history = await this.adminScanHistoryRepository.findWhereEqualInMap([
      {
        map: '/',
        key: 'createdBy',
        operator: DataModelFieldMapOperatorType.Equals,
        value: adminId,
      },
      {
        map: '/',
        key: 'appointmentId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: appointmentId,
      },
    ])
    if (history?.length > 0) {
      throw new DuplicateDataException('BarCode already scanned')
    }
  }

  async addAdminScanHistory(
    userId: string,
    appointmentId: string,
    type: TestTypes,
  ): Promise<AdminScanHistory> {
    await this.checkDuplicatedScanHistory(userId, appointmentId)
    return this.adminScanHistoryRepository.save({
      createdBy: userId,
      type,
      appointmentId: appointmentId,
    })
  }

  async getAppointmentByHistory(adminId: string, type: TestTypes): Promise<AppointmentDBModel[]> {
    const scanHistory = await this.adminScanHistoryRepository.findWhereEqualInMap([
      {
        map: '/',
        operator: DataModelFieldMapOperatorType.Equals,
        key: 'createdBy',
        value: adminId,
      },
      {
        map: '/',
        operator: DataModelFieldMapOperatorType.Equals,
        key: 'type',
        value: type,
      },
    ])
    const scannedIds = scanHistory.map(({appointmentId}) => appointmentId)
    return scannedIds ? this.appointmentsRepository.getAppointmentsDBByIds(scannedIds) : []
  }

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
  ): Promise<(AppointmentDBModel & {organizationName: string; labName?: string})[]> {
    const conditions = []
    let appointments: AppointmentDBModel[] = []
    if (queryParams.labId) {
      conditions.push({
        map: '/',
        key: 'labId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: queryParams.labId === 'null' ? null : queryParams.labId,
      })
    }
    if (queryParams.organizationId) {
      conditions.push({
        map: '/',
        key: 'organizationId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: queryParams.organizationId === 'null' ? null : queryParams.organizationId,
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

    if (queryParams.testType) {
      appointments = appointments.filter(
        (appointment) => appointment.testType == queryParams.testType,
      )
    }

    const labs = await this.labService.getAll()
    const lab = (appointment) => labs.find(({id}) => id == appointment?.labId)

    return appointments.map((appointment) => ({
      ...appointment,
      organizationName: organizations[appointment.organizationId],
      labName: lab(appointment)?.name,
    }))
  }

  async getAppointmentByIdFromAcuity(id: number): Promise<AppointmentAcuityResponse> {
    return this.acuityRepository.getAppointmentByIdFromAcuity(id)
  }

  async getAppointmentOnlyDBById(id: string): Promise<AppointmentDBModel> {
    const appointment = await this.appointmentsRepository.get(id)
    return appointment
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
    isOpnSuperAdmin: boolean,
  ): Promise<AppointmentDBModel & {canCancel: boolean}> {
    const appointment = await this.getAppointmentDBById(id)
    return {
      ...appointment,
      canCancel: this.getCanCancelOrReschedule(isOpnSuperAdmin, appointment.appointmentStatus),
    }
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
      appointmentStatus: AppointmentStatus
      latestResult: ResultTypes
      couponCode?: string
      userId?: string
    },
  ): Promise<AppointmentDBModel> {
    const data = await this.mapAcuityAppointmentToDBModel(acuityAppointment, additionalData)
    const saved = await this.appointmentsRepository.save(data)
    this.postPubsub(saved, 'created')
    return saved
  }

  async updateAppointmentFromAcuity(
    appointmentDb: AppointmentDBModel,
    acuityAppointment: AppointmentAcuityResponse,
    additionalData: {
      barCodeNumber: string
      organizationId: string
      appointmentStatus: AppointmentStatus
      latestResult: ResultTypes
    },
  ): Promise<AppointmentDBModel> {
    const id = appointmentDb.id
    const data = await this.mapAcuityAppointmentToDBModel(
      acuityAppointment,
      additionalData,
      appointmentDb,
    )

    const [saved] = await Promise.all([
      this.updateAppointmentDB(id, data, AppointmentActivityAction.UpdateFromAcuity),
      // create or update user related collections
      this.updatedUserRelatedData(data),
    ])

    this.postPubsub(saved, 'updated')
    return saved
  }

  async updatedUserRelatedData(data: Omit<AppointmentDBModel, 'id'>): Promise<void> {
    // handle user address update
    if (data.userId) {
      await this.userAddressService.InsertIfNotExists(data.userId, data.address)
    }
  }

  private async getDateFields(acuityAppointment: AppointmentAcuityResponse) {
    const dateTimeStr = acuityAppointment.datetime
    const dateTimeTz = moment(dateTimeStr).tz(timeZone)
    const label = acuityAppointment.labels ? acuityAppointment.labels[0]?.name : null
    const utcDateTime = moment(dateTimeStr).utc()

    const dateTime = makeFirestoreTimestamp(dateTimeStr)
    const dateOfAppointment = dateTimeTz.format(dateFormats.longMonth)
    const timeOfAppointment = dateTimeTz.format(timeFormats.standard12h)
    const deadline = makeDeadline(utcDateTime, label)
    return {
      deadline,
      dateOfAppointment,
      timeOfAppointment,
      dateTime,
    }
  }

  private async mapAcuityAppointmentToDBModel(
    acuityAppointment: AppointmentAcuityResponse,
    additionalData: {
      barCodeNumber: string
      organizationId: string
      appointmentStatus: AppointmentStatus
      latestResult: ResultTypes
      couponCode?: string
      userId?: string
    },
    appointmentDb?: AppointmentDBModel,
  ): Promise<Omit<AppointmentDBModel, 'id'>> {
    const newDateTimeTz = moment(acuityAppointment.datetime).utc()
    const oldDateTimeTz = appointmentDb?.dateTime && firestoreTimeStampToUTC(appointmentDb.dateTime)
    let dateTimeUpdates: {
      deadline?: firestore.Timestamp
      dateOfAppointment?: string
      timeOfAppointment?: string
      dateTime?: firestore.Timestamp
    } = {}

    if (!appointmentDb || !newDateTimeTz.isSame(oldDateTimeTz)) {
      const {deadline, dateOfAppointment, timeOfAppointment, dateTime} = await this.getDateFields(
        acuityAppointment,
      )
      dateTimeUpdates = {
        deadline,
        dateOfAppointment,
        timeOfAppointment,
        dateTime,
      }
    }

    const {
      barCodeNumber,
      organizationId,
      appointmentStatus,
      latestResult,
      couponCode = '',
      userId,
    } = additionalData
    const getNewUserId = async (): Promise<string | null> => {
      if (Config.getInt('FEATURE_CREATE_USER_ON_ENTERPRISE')) {
        const user = await this.enterpriseAdapter.findOrCreateUser({
          email: acuityAppointment.email,
          firstName: acuityAppointment.firstName,
          lastName: acuityAppointment.lastName,
          organizationId: acuityAppointment.organizationId || '',
          address: acuityAppointment.address,
          dateOfBirth: acuityAppointment.dateOfBirth,
          agreeToConductFHHealthAssessment: acuityAppointment.agreeToConductFHHealthAssessment,
          shareTestResultWithEmployer: acuityAppointment.shareTestResultWithEmployer,
          readTermsAndConditions: acuityAppointment.readTermsAndConditions,
          receiveResultsViaEmail: acuityAppointment.receiveResultsViaEmail,
          receiveNotificationsFromGov: acuityAppointment.receiveNotificationsFromGov,
        })
        return user.data ? user.data.id : null
      }
      return null
    }

    const currentUserId = userId ? userId : await getNewUserId()

    return {
      acuityAppointmentId: Number(acuityAppointment.id),
      appointmentStatus,
      appointmentTypeID: Number(acuityAppointment.appointmentTypeID),
      barCode: barCodeNumber,
      canceled: acuityAppointment.canceled,
      calendarID: Number(acuityAppointment.calendarID),
        dateOfBirth: acuityAppointment.dateOfBirth,
      dateOfAppointment: dateTimeUpdates.dateOfAppointment ?? appointmentDb.dateOfAppointment,
      dateTime: dateTimeUpdates.dateTime ?? appointmentDb.dateTime,
      deadline: dateTimeUpdates.deadline ?? appointmentDb.deadline,
      timeOfAppointment: dateTimeUpdates.timeOfAppointment ?? appointmentDb.timeOfAppointment,
        email: acuityAppointment.email,
        firstName: acuityAppointment.firstName,
        lastName: acuityAppointment.lastName,
        organizationId: acuityAppointment.organizationId || organizationId || null,
      packageCode: acuityAppointment.certificate,
        phone: acuityAppointment.phone,
      registeredNursePractitioner: acuityAppointment.registeredNursePractitioner,
      latestResult,
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
      locationName: acuityAppointment.calendar,
      locationAddress: acuityAppointment.location,
      testType: await this.appointmentToTestTypeRepository.getTestType(
        acuityAppointment.appointmentTypeID,
      ),
        gender: acuityAppointment.gender || Gender.PreferNotToSay,
        postalCode: acuityAppointment.postalCode,
      scheduledPushesToSend: [
        ReservationPushTypes.before24hours,
        ReservationPushTypes.before3hours,
      ],
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
    isOpnSuperAdmin: boolean,
    organizationId?: string,
  ): Promise<void> {
    const appointmentFromDB = await this.appointmentsRepository.get(appointmentId)
    if (!appointmentFromDB) {
      console.log(
        `AppoinmentService: cancelAppointment AppointmentIDFromDB: "${appointmentId}" not found`,
      )
      throw new ResourceNotFoundException(`Invalid Appointment ID`)
    }

    const canCancel = this.getCanCancelOrReschedule(
      isOpnSuperAdmin,
      appointmentFromDB.appointmentStatus,
    )

    if (!canCancel) {
      console.warn(
        `cancelAppointment: Failed for appointmentId ${appointmentId} isOpnSuperAdmin: ${isOpnSuperAdmin} appointmentStatus: ${appointmentFromDB.appointmentStatus}`,
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

  async makeCanceled(appointmentId: string, userId: string): Promise<AppointmentDBModel> {
    await this.appointmentsRepository.addStatusHistoryById(
      appointmentId,
      AppointmentStatus.InProgress,
      userId,
    )
    const saved = await this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.Canceled,
      canceled: true,
    })
    this.postPubsub(saved, 'canceled')
    return saved
  }

  async makeInProgress(
    appointmentId: string,
    testRunId: string,
    userId: string,
  ): Promise<AppointmentDBModel> {
    await this.appointmentStatusChange(appointmentId, AppointmentStatus.InProgress, userId)

    const saved = await this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.InProgress,
      testRunId,
    })
    this.postPubsub(saved, 'updated')
    return saved
  }

  async makeBulkAction(
    appointmentId: string,
    data: BulkData,
    actionType: AppointmentBulkAction,
    userId?: string,
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
          await this.addTransportRun(appointmentId, data as UpdateTransPortRun)
          break

        case AppointmentBulkAction.AddAppointmentLabel:
          await this.addAppointmentLabel(appointment, data.label, userId)
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
    await this.appointmentStatusChange(appointmentId, AppointmentStatus.Received, userId)

    const saved = await this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.Received,
      vialLocation,
    })
    this.postPubsub(saved, 'updated')
  }

  async addTransportRun(appointmentId: string, data: UpdateTransPortRun): Promise<void> {
    const savedAppointment = await this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.InTransit,
      transportRunId: data.transportRunId,
      labId: data.labId ?? null,
    })
    await this.createOrUpdatePCRResults(savedAppointment, data.userId)

    await this.appointmentsRepository.addStatusHistoryById(
      appointmentId,
      AppointmentStatus.InTransit,
      data.userId,
    )
    this.postPubsub(savedAppointment, 'updated')
  }

  async createOrUpdatePCRResults(appointment: AppointmentDBModel, adminId: string): Promise<void> {
    const pcrResults = await this.pcrTestResultsRepository.getPCRResultsByAppointmentId(
      appointment.id,
    )
    if (pcrResults.length === 0) {
      const linkedBarCodes = await this.getlinkedBarcodes(appointment.packageCode)
      const pcrTest = await this.pcrTestResultsRepository.createNewTestResults({
        appointment: appointment,
        adminId,
        linkedBarCodes,
        reCollectNumber: linkedBarCodes.length + 1,
        runNumber: 1,
        previousResult: null,
        labId: appointment.labId,
      })
      LogInfo('AppoinmentService:createOrUpdatePCRResults', 'SuccessfullyCreatedNewPCRResult', {
        id: pcrTest.id,
        appointmentId: appointment.id,
      })
    } else {
      await this.pcrTestResultsRepository.updateAllResultsForAppointmentId(
        appointment.id,
        {labId: appointment.labId, appointmentStatus: AppointmentStatus.InTransit},
        PcrResultTestActivityAction.UpdateFromAppointment,
        appointment.userId,
      )
    }
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

  async addAppointmentLabel(
    appointment: AppointmentDBModel,
    label: DeadlineLabel,
    userId: string,
  ): Promise<void> {
    const deadline = makeDeadline(moment(appointment.dateTime.toDate()).utc(), label)

    await Promise.all([
      this.pcrTestResultsRepository.updateAllResultsForAppointmentId(
        appointment.id,
        {
          deadline,
          deadlineDate: getFirestoreTimeStampDate(deadline),
        },
        PcrResultTestActivityAction.UpdateFromAppointment,
        userId,
      ),
      this.updateAppointmentDB(appointment.id, {deadline}),
    ])
    await this.createCloudTaskToSyncLabelWithAcuity(appointment.acuityAppointmentId, label)
  }

  async createCloudTaskToSyncLabelWithAcuity(
    acuityID: number,
    label: DeadlineLabel,
  ): Promise<void> {
    try {
      await this.cloudTasks.createTask(
        {
          acuityID,
          label,
        },
        '/reservation/internal/api/v1/appointments/sync-labels-to-acuity',
      )
    } catch (err) {
      //Safe To Ignore
      LogInfo('AppoinmentService:addAppointmentLabel', 'FailedToCreateTaskToSyncLabel', {
        acuityID,
        label,
        errorMessage: err,
      })
    }
  }

  async addAppointmentLabelOnAcuity(
    acuityID: number,
    label: DeadlineLabel,
  ): Promise<AppointmentAcuityResponse> {
    return this.acuityRepository.addAppointmentLabelOnAcuity(acuityID, label)
  }

  async addAppointmentBarCodeOnAcuity(
    acuityID: number,
    newBarCode: string,
  ): Promise<AppointmentAcuityResponse> {
    return await this.updateAppointment(acuityID, {
      barCodeNumber: newBarCode,
    })
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
    await this.appointmentStatusChange(
      data.appointment.id,
      AppointmentStatus.ReRunRequired,
      data.userId,
    )

    await this.pcrTestResultsRepository.updateAllResultsForAppointmentId(
      data.appointment.id,
      {
        deadline,
        deadlineDate: getFirestoreTimeStampDate(deadline),
      },
      PcrResultTestActivityAction.UpdateFromAppointment,
      data.actionBy,
    )

    const saved = await this.appointmentsRepository.updateProperties(data.appointment.id, {
      appointmentStatus: AppointmentStatus.ReRunRequired,
      deadline: deadline,
    })

    await this.createCloudTaskToSyncLabelWithAcuity(
      data.appointment.acuityAppointmentId,
      data.deadlineLabel,
    )
    this.postPubsub(saved, 'updated')
    return saved
  }

  async changeStatusToReCollectRequired(
    appointmentId: string,
    userId: string,
  ): Promise<AppointmentDBModel> {
    await this.appointmentStatusChange(appointmentId, AppointmentStatus.ReCollectRequired, userId)
    const saved = await this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.ReCollectRequired,
    })
    this.postPubsub(saved, 'updated')
    return saved
  }

  async getAppointmentDBByPackageCode(packageCode: string): Promise<AppointmentDBModel[]> {
    return this.appointmentsRepository.findWhereEqual('packageCode', packageCode)
  }

  async copyAppointment(
    appointmentId: string,
    date: string,
    adminId: string,
    organizationId: string,
  ): Promise<BulkOperationResponse> {
    //get the appointment that will be copied
    const appointment = await this.appointmentsRepository.getAppointmentById(appointmentId)
    if (!appointment) {
      LogInfo('AppoinmentService:copyAppointment', 'InvalidAppointmentId', {
        appointmentID: appointmentId,
      })
      return Promise.resolve({
        id: appointmentId,
        status: BulkOperationStatus.Failed,
        reason: 'Bad Request',
      })
    }
    if (!appointment.packageCode) {
      LogInfo('AppoinmentService:copyAppointment', 'InvalidPackageCode', {
        appointmentID: appointmentId,
      })
      return Promise.resolve({
        id: appointmentId,
        status: BulkOperationStatus.Failed,
        reason: 'Bad Request',
      })
    }
    if (organizationId && organizationId !== appointment.organizationId) {
      LogError(
        'AdminAppointmentController:getUserAppointmentHistoryByAppointmentId',
        'BadOrganizationId',
        {
          organizationId: appointment.organizationId,
          appointmentID: appointmentId,
          requestedOrganization: organizationId,
        },
      )
      return {
        id: appointment.id,
        barCode: appointment.barCode,
        status: BulkOperationStatus.Failed,
        reason: 'Invalid Request',
      }
    }

    const barCodeNumber = await this.getNextBarCodeNumber()
    const appointmentTime = getTimeFromFirestoreDateTime(appointment.dateTime)
    const dateTime = makeDefaultIsoDate(date, appointmentTime)

    const packageCode = await this.packageService.getAllByOrganizationId(
      appointment.organizationId,
      1,
      1,
    )
    let acuityAppointment = null
    try {
      acuityAppointment = await this.acuityRepository.createAppointment({
        dateTime,
        appointmentTypeID: appointment.appointmentTypeID,
        firstName: appointment.firstName,
        lastName: appointment.lastName,
        email: appointment.email,
        phone: appointment.phone + '',
        packageCode: packageCode[0].packageCode,
        calendarID: appointment.calendarID,
        fields: {
          dateOfBirth: appointment.dateOfBirth,
          address: appointment.address,
          addressUnit: appointment.addressUnit,
          shareTestResultWithEmployer: appointment.shareTestResultWithEmployer,
          readTermsAndConditions: appointment.readTermsAndConditions,
          agreeToConductFHHealthAssessment: appointment.agreeToConductFHHealthAssessment,
          receiveResultsViaEmail: appointment.receiveResultsViaEmail,
          receiveNotificationsFromGov: appointment.receiveNotificationsFromGov,
          barCodeNumber,
        },
      })
      if (!acuityAppointment.id) {
        return {
          id: appointment.id,
          barCode: appointment.barCode,
          status: BulkOperationStatus.Failed,
          reason: 'Failed to Book Appointment',
        }
      }
    } catch (err) {
      LogError('AdminAppointmentController:copyAppointment', 'FailedToCreateOnAcuity', {
        appointmentID: appointmentId,
        appointmentDateTime: dateTime,
        errorMessage: err,
      })
      return {
        id: appointment.id,
        barCode: appointment.barCode,
        status: BulkOperationStatus.Failed,
        reason: 'Failed to Book Appointment',
      }
    }

    const savedAppointment = await this.createAppointmentFromAcuity(acuityAppointment, {
      barCodeNumber,
      appointmentStatus: AppointmentStatus.Pending,
      latestResult: ResultTypes.Pending,
      organizationId: appointment.organizationId,
      userId: appointment.userId,
    })

    if (savedAppointment) {
      const linkedBarCodes = []
      const pcrTestResult = await this.pcrTestResultsRepository.createNewTestResults({
        appointment: savedAppointment,
        adminId: adminId,
        linkedBarCodes,
        reCollectNumber: linkedBarCodes.length + 1,
        runNumber: 1,
        previousResult: null,
      })
      console.log(
        `AppointmentWebhookController: CreateAppointment: SuccessCreatePCRResults for AppointmentID: ${savedAppointment.id} PCR Results ID: ${pcrTestResult.id}`,
      )
    } else {
      LogError('AdminAppointmentController:copyAppointment', 'FailedCopyAppointment', {
        appointmentID: appointmentId,
        appointmentDateTime: dateTime,
      })
      return {
        id: appointment.id,
        barCode: appointment.barCode,
        status: BulkOperationStatus.Failed,
        reason: 'Failed to Book Appointment',
      }
    }

    return {
      id: savedAppointment.id,
      barCode: savedAppointment.barCode,
      status: BulkOperationStatus.Success,
    }
  }

  async createAcuityAppointment({
    slotId,
    firstName,
    lastName,
    gender,
    email,
    phone,
    dateOfBirth,
    address,
    addressUnit,
    postalCode,
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
    const dateTime = utcDateTime.tz(timeZone).format()
    const barCodeNumber = await this.getNextBarCodeNumber()
    const acuityAppointment = await this.acuityRepository.createAppointment({
      dateTime,
      appointmentTypeID: appointmentTypeId,
      firstName,
      lastName,
      email,
      phone: `${phone.code}${phone.number}`,
      packageCode,
      calendarID: calendarId,
      fields: {
        dateOfBirth,
        gender,
        address,
        addressUnit,
        postalCode,
        shareTestResultWithEmployer,
        readTermsAndConditions,
        agreeToConductFHHealthAssessment,
        receiveResultsViaEmail,
        receiveNotificationsFromGov,
        barCodeNumber,
      },
    })
    return this.createAppointmentFromAcuity(acuityAppointment, {
      barCodeNumber,
      appointmentStatus: AppointmentStatus.Pending,
      latestResult: ResultTypes.Pending,
      organizationId,
      couponCode,
      userId,
    })
  }

  /**
   * TODO:
   * 1. Cart coupon
   */
  async createAcuityAppointmentFromCartItem(
    cartDdItem: CardItemDBModel,
    userId: string,
    email: string,
  ): Promise<AppointmentDBModel> {
    const {appointment, patient} = cartDdItem

    const utcDateTime = moment(appointment.time).utc()
    const dateTime = utcDateTime.tz(timeZone).format()
    const barCodeNumber = await this.getNextBarCodeNumber()

    const acuityAppointment = await this.acuityRepository.createAppointment({
      dateTime,
      appointmentTypeID: appointment.appointmentTypeId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email,
      phone: `${patient.phone.code}${patient.phone.number}`,
      packageCode: appointment.packageCode,
      calendarID: appointment.calendarId,
      fields: {
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        address: patient.address,
        addressUnit: patient.addressUnit,
        postalCode: patient.postalCode,
        shareTestResultWithEmployer: patient.shareTestResultWithEmployer,
        readTermsAndConditions: patient.readTermsAndConditions,
        agreeToConductFHHealthAssessment: patient.agreeToConductFHHealthAssessment,
        receiveResultsViaEmail: patient.receiveResultsViaEmail,
        receiveNotificationsFromGov: patient.receiveNotificationsFromGov,
        barCodeNumber,
      },
    })
    return this.createAppointmentFromAcuity(acuityAppointment, {
      barCodeNumber,
      appointmentStatus: AppointmentStatus.Pending,
      latestResult: ResultTypes.Pending,
      organizationId: appointment.organizationId,
      couponCode: null,
      userId,
    })
  }

  async getAvailableTimes(appointmentId: string, date: string): Promise<{label: string}[]> {
    const appointment = await this.getAppointmentDBById(appointmentId)
    const slots = await this.acuityRepository.getAvailableSlots(
      Number(appointment.appointmentTypeID),
      date,
      Number(appointment.calendarID),
      '',
    )
    return slots.map((slot) => {
      return {
        label: moment(slot.time).tz(timeZone).format(timeFormats.standard12h),
        time: slot.time,
      }
    })
  }

  async getAvailableDates(
    appointmentId: string,
    year: string,
    month: string,
  ): Promise<{id: string; availableDates: {date: string}[]}> {
    const appointment = await this.getAppointmentDBById(appointmentId)
    const yearMonth = `${year}-${month}`
    const id = encodeAvailableTimeId({
      appointmentTypeId: Number(appointment.appointmentTypeID),
      calendarId: Number(appointment.calendarID),
      date: yearMonth,
    })
    const availableDates = await this.acuityRepository.getAvailabilityDates(
      Number(appointment.appointmentTypeID),
      yearMonth,
      Number(appointment.calendarID),
      '',
    )
    return {
      id,
      availableDates,
    }
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
      calendarName,
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
        calendarName,
        date,
        time,
        organizationId,
        packageCode,
      }
      const id = encodeAvailableTimeId(idBuf)

      return {
        id,
        label: moment(time).tz(calendarTimezone).utc().toISOString(),
        slotsAvailable: slotsAvailable,
      }
    })
  }

  getCanCancelOrReschedule(
    isOpnSuperAdmin: boolean,
    appointmentStatus: AppointmentStatus,
  ): boolean {
    return (
      (!isOpnSuperAdmin && appointmentStatus === AppointmentStatus.Pending) ||
      (isOpnSuperAdmin &&
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
    const appointments = await this.appointmentsRepository.getAppointmentsDBByIds(appointmentIds)
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
        ? Array.from(firstBarCodeMatch.values())
            .filter(
              ({barCode}) => !failed.find(({barCode: failedBarCode}) => barCode === failedBarCode),
            )
            .map(({id}) => id)
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

    const updatedAppoinment = await this.appointmentsRepository.updateBarCodeById(
      appointmentId,
      newBarCode,
      userId,
    )

    await this.pcrTestResultsRepository.updateAllResultsForAppointmentId(
      appointmentId,
      {
        barCode: newBarCode,
      },
      PcrResultTestActivityAction.RegenerateBarcode,
      userId,
    )

    try {
      await this.cloudTasks.createTask(
        {
          acuityID: appointment.acuityAppointmentId,
          barCode: newBarCode,
        },
        '/reservation/internal/api/v1/appointments/sync-barcode-to-acuity',
      )
    } catch (err) {
      //Safe To Ignore
      LogInfo('AppoinmentService:addAppointmentLabel', 'FailedToCreateTaskToSyncBarCode', {
        acuityID: appointment.acuityAppointmentId,
        barCode: newBarCode,
        errorMessage: err,
      })
    }
    return updatedAppoinment
  }

  async getAppointmentsStats(
    queryParams: AppointmentByOrganizationRequest,
  ): Promise<{
    appointmentStatusArray: Filter[]
    orgIdArray: Filter[]
    appointmentStatsByLabIdArr: Filter[]
    total: number
  }> {
    const appointments = await this.getAppointmentsDB(queryParams)
    const appointmentStatsByTypes: Record<AppointmentStatus, number> = {} as Record<
      AppointmentStatus,
      number
    >
    const appointmentStatsByOrganization: Record<string, number> = {}
    const appointmentStatsByLabId: Record<string, number> = {}
    const labs: Record<string, string> = {}

    appointments.forEach((appointment) => {
      if (appointmentStatsByTypes[appointment.appointmentStatus]) {
        ++appointmentStatsByTypes[appointment.appointmentStatus]
      } else {
        appointmentStatsByTypes[appointment.appointmentStatus] = 1
      }
      if (appointmentStatsByOrganization[appointment.organizationId]) {
        appointmentStatsByOrganization[appointment.organizationId]++
      } else {
        appointmentStatsByOrganization[appointment.organizationId] = 1
      }
      if (appointmentStatsByLabId[appointment.labId]) {
        ++appointmentStatsByLabId[appointment.labId]
      } else {
        appointmentStatsByLabId[appointment.labId] = 1
        labs[appointment.labId] = appointment.labName
      }
    })
    const organizations = await this.organizationService.getAllByIds(
      [...Object.keys(appointmentStatsByOrganization)].filter((appointment) => !!appointment),
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
    const appointmentStatsByLabIdArr = Object.entries(appointmentStatsByLabId)
      .filter(([labId]) => labId !== 'undefined') // @TODO REMOVE THIS FILTER AFTER MIGRATING APPOINTMENTS
      .map(([labId, count]) => ({
        id: labId === 'undefined' ? 'null' : labId,
        name: labId === 'undefined' ? 'None' : labs[labId],
        count,
      }))
    return {
      appointmentStatusArray: appointmentStatsByTypesArr,
      orgIdArray: appointmentStatsByOrgIdArr,
      appointmentStatsByLabIdArr,
      total: appointments.length,
    }
  }

  async deleteScanHistory(adminId: string, type: TestTypes): Promise<void> {
    const scanHistory = await this.adminScanHistoryRepository.findWhereEqualInMap([
      {
        map: '/',
        operator: DataModelFieldMapOperatorType.Equals,
        key: 'createdBy',
        value: adminId,
      },
      {
        map: '/',
        operator: DataModelFieldMapOperatorType.Equals,
        key: 'type',
        value: type,
      },
    ])
    if (scanHistory.length) {
      return await this.adminScanHistoryRepository.deleteBulk(scanHistory.map(({id}) => id))
    }
    throw new ResourceNotFoundException('History for this admin is empty')
  }

  async makeCheckIn(appointmentId: string, userId: string): Promise<AppointmentDBModel> {
    if (!(await this.checkAppointmentStatusOnly(appointmentId, AppointmentStatus.Pending))) {
      throw new BadRequestException('Appointment status should be on Pending state')
    }

    await this.appointmentStatusChange(appointmentId, AppointmentStatus.CheckedIn, userId)

    const saved = await this.appointmentsRepository.changeAppointmentStatus(
      appointmentId,
      AppointmentStatus.CheckedIn,
    )
    this.postPubsub(saved, 'updated')
    return saved
  }

  async getAppointmentValidatedForUpdate(
    appointmentId: string,
    isOpnSuperAdmin: boolean,
    organizationId?: string,
  ): Promise<AppointmentDBModel> {
    const appointmentFromDB = await this.appointmentsRepository.get(appointmentId)
    if (!appointmentFromDB) {
      LogWarning('AppoinmentService: rescheduleAppointment', 'BadAppointmentID', {
        appointmentId,
      })
      throw new ResourceNotFoundException(`Invalid Appointment ID`)
    }

    const canReschedule = this.getCanCancelOrReschedule(
      isOpnSuperAdmin,
      appointmentFromDB.appointmentStatus,
    )
    if (!canReschedule) {
      LogWarning('AppoinmentService: rescheduleAppointment', 'NotAllowedToReschedule', {
        appointmentId,
        isOpnSuperAdmin,
        appointmentStatus: appointmentFromDB.appointmentStatus,
      })
      throw new BadRequestException(
        `Appointment can't be rescheduled. It is already in ${appointmentFromDB.appointmentStatus} state`,
      )
    }

    if (organizationId && appointmentFromDB.organizationId !== organizationId) {
      LogWarning('AppoinmentService: rescheduleAppointment', 'Incorrect Organization ID', {
        appointmentId,
        isOpnSuperAdmin,
        organizationId,
      })
      throw new BadRequestException(`Appointment doesn't belong to selected Organization`)
    }
    return appointmentFromDB
  }

  async rescheduleAppointment(requestData: RescheduleAppointmentDTO): Promise<AppointmentDBModel> {
    const {appointmentId, isOpnSuperAdmin, organizationId} = requestData
    const appointmentFromDB = await this.getAppointmentValidatedForUpdate(
      appointmentId,
      isOpnSuperAdmin,
      organizationId,
    )
    const acuityAppointment = await this.acuityRepository.rescheduleAppoinmentOnAcuity(
      appointmentFromDB.acuityAppointmentId,
      requestData.dateTime,
    )
    const dateTimeData = await this.getDateFields(acuityAppointment)
    const updatedAppointment = await this.appointmentsRepository.updateData(
      appointmentId,
      dateTimeData,
    )

    await this.pcrTestResultsRepository.updateAllResultsForAppointmentId(
      appointmentId,
      {
        dateTime: dateTimeData.dateTime,
        deadline: dateTimeData.deadline,
        deadlineDate: getFirestoreTimeStampDate(dateTimeData.deadline),
        dateOfAppointment: getFirestoreTimeStampDate(dateTimeData.dateTime),
      },
      PcrResultTestActivityAction.UpdateFromAppointment,
      requestData.userID,
    )

    LogInfo('AppoinmentService:rescheduleAppointment', 'AppointmentRescheduled', {
      appoinmentId: updatedAppointment.id,
      appointmentDateTime: dateTimeData.dateTime,
    })
    return updatedAppointment
  }

  async getUserAppointments(userId: string, labId: string): Promise<AppointmentDBModel[]> {
    const conditions = []
    if (labId) {
      conditions.push({
        map: '/',
        key: 'labId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: labId,
      })
    }

    conditions.push({
      map: '/',
      key: 'userId',
      operator: DataModelFieldMapOperatorType.Equals,
      value: userId,
    })

    return this.appointmentsRepository.findWhereEqualInMap(conditions)
  }

  private async appointmentStatusChange(
    appointmentId: string,
    newStatus: AppointmentStatus,
    userId: string,
  ) {
    const [updatedAppoinment] = await Promise.all([
      await this.appointmentsRepository.addStatusHistoryById(appointmentId, newStatus, userId),
      this.pcrTestResultsRepository.updateAllResultsForAppointmentId(
        appointmentId,
        {appointmentStatus: newStatus},
        PcrResultTestActivityAction.UpdateFromAppointment,
        userId,
      ),
    ])

    return updatedAppoinment
  }

  async getAcuityAppointmentTypes(): Promise<AppointmentTypes[]> {
    return this.acuityRepository.getAppointmentTypeList()
  }

  async getAppointmentsNotNotifiedInPeriod(
    fromDateTime: moment.Moment,
    untilDateTime: moment.Moment,
  ): Promise<AppointmentDBModel[]> {
    return this.appointmentsRepository.findWhereEqualInMap(
      [
        {
          map: '/',
          key: 'dateTime',
          operator: DataModelFieldMapOperatorType.Greater,
          value: new Date(fromDateTime.toDate()),
        },
        {
          map: '/',
          key: 'dateTime',
          operator: DataModelFieldMapOperatorType.Less,
          value: new Date(untilDateTime.toDate()),
        },
        {
          map: '/',
          key: 'scheduledPushesToSend',
          operator: DataModelFieldMapOperatorType.ArrayContainsAny,
          value: [ReservationPushTypes.before24hours, ReservationPushTypes.before3hours],
        },
      ],
      {
        key: 'dateTime',
        direction: 'desc',
      },
    )
  }

  async removeBatchScheduledPushesToSend(
    batchAppointments: DbBatchAppointments[],
  ): Promise<unknown[]> {
    return this.appointmentsRepository.removeBatchScheduledPushesToSend(batchAppointments)
  }

  async getlinkedBarcodes(couponCode: string): Promise<string[]> {
    let linkedBarcodes = []
    if (couponCode) {
      //Get Coupon
      const coupon = await this.couponRepository.getByCouponCode(couponCode)
      if (coupon) {
        linkedBarcodes.push(coupon.lastBarcode)
        try {
          //Get Linked Barcodes for LastBarCode
          const pcrResult = await this.pcrTestResultsRepository.getReCollectedTestResultByBarCode(
            coupon.lastBarcode,
          )
          if (pcrResult.linkedBarCodes && pcrResult.linkedBarCodes.length) {
            linkedBarcodes = linkedBarcodes.concat(pcrResult.linkedBarCodes)
          }
        } catch (error) {
          LogWarning('AppoinmentService:getlinkedBarcodes', 'NoCouponCodeFound', {
            couponCode,
            barCode: coupon.lastBarcode,
            errorMessage: error.toString(),
          })
        }
        LogInfo('AppoinmentService:getlinkedBarcodes', 'NoCouponCodeFound', {
          couponCode,
          linkedBarcodes,
        })
      } else {
        LogInfo('AppoinmentService:getlinkedBarcodes', 'NoCouponCodeFound', {
          couponCode,
        })
      }
    }
    return linkedBarcodes
  }
}
