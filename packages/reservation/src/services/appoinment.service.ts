import moment from 'moment'
import {flatten} from 'lodash'

import DataStore from '../../../common/src/data/datastore'

import {
  AppoinmentBarCodeSequenceDBModel,
  AppointmentAcuityResponse,
  AppointmentAttachTransportStatus,
  AppointmentByOrganizationRequest,
  AppointmentDBModel,
  AppointmentModelBase,
  AppointmentStatus,
  AppointmentStatusHistoryDb,
  DeadlineLabel,
} from '../models/appointment'
import {AcuityRepository} from '../respository/acuity.repository'
import {AppointmentsBarCodeSequence} from '../respository/appointments-barcode-sequence'
import {
  AppointmentsRepository,
  StatusHistoryRepository,
} from '../respository/appointments-repository'
import {PCRTestResultsRepository} from '../respository/pcr-test-results-repository'

import {dateFormats, now} from '../../../common/src/utils/times'
import {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import {Config} from '../../../common/src/utils/config'
import {makeTimeEndOfTheDay} from '../../../common/src/utils/utils'
import {makeDeadline} from '../../../common/src/utils/datetime-util'

import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {DuplicateDataException} from '../../../common/src/exceptions/duplicate-data-exception'

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
    if (queryParams.dateOfAppointment) {
      conditions.push({
        map: '/',
        key: 'dateOfAppointment',
        operator: DataModelFieldMapOperatorType.Equals,
        value: moment(queryParams.dateOfAppointment).format(dateFormats.longMonth),
      })
    }
    if (queryParams.deadlineDate) {
      conditions.push({
        map: '/',
        key: 'deadline',
        operator: DataModelFieldMapOperatorType.Equals,
        value: makeTimeEndOfTheDay(
          moment.tz(`${queryParams.deadlineDate}`, 'YYYY-MM-DD', timeZone).utc(),
        ),
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
    if (queryParams.testRunId) {
      conditions.push({
        map: '/',
        key: 'testRunId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: queryParams.testRunId,
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

  async saveAppointmentData(appointment: AppointmentModelBase): Promise<AppointmentDBModel> {
    return this.appointmentsRepository.save(appointment)
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
    organizationId?: string,
  ): Promise<void> {
    const appointmentFromDB = await this.getAppointmentDBById(appointmentId)
    if (!appointmentFromDB) {
      console.log(
        `AppoinmentService: cancelAppointment AppointmentIDFromDB: "${appointmentId}" not found`,
      )
      throw new ResourceNotFoundException(`Invalid Appointment ID`)
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

    if (appointmentFromAcuity.canceled) {
      console.log(
        `AppoinmentService: cancelAppointment AppointmentIDFromAcuity: "${appointmentFromDB.acuityAppointmentId}" is already cancelled!`,
      )
      throw new BadRequestException(`Appointment is allready cancelled`)
    }

    if (!appointmentFromAcuity.canClientCancel) {
      console.log(
        `AppoinmentService: cancelAppointment AppointmentIDFromAcuity: "${appointmentFromDB.acuityAppointmentId}" can not be cancelled. Client Cancellation is not available.`,
      )
      throw new BadRequestException(`Appointment Cancellation is not available.`)
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

  async addAppointmentLabel(id: number, data: unknown): Promise<AppointmentAcuityResponse> {
    const appointment = await this.getAppointmentByAcuityId(id)

    const deadline = makeDeadline(
      moment(appointment.dateTime).tz(timeZone).utc(),
      Boolean(data[DeadlineLabel.NextDay]),
    )

    await this.updateAppointmentDB(appointment.id, {deadline})

    return this.acuityRepository.addAppointmentLabelOnAcuity(id, data)
  }

  async updateAppointmentDB(
    id: string,
    data: Partial<AppointmentDBModel>,
  ): Promise<AppointmentDBModel> {
    return this.appointmentsRepository.updateProperties(id, data)
  }

  async changeStatusToReRunRequired(
    appointmentId: string,
    nextDay: boolean,
    userId: string,
  ): Promise<AppointmentDBModel> {
    const utcDateTime = moment.utc()
    const deadline = makeDeadline(utcDateTime, nextDay)
    await this.addStatusHistoryById(appointmentId, AppointmentStatus.ReRunRequired, userId)
    return this.appointmentsRepository.updateProperties(appointmentId, {
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
}
