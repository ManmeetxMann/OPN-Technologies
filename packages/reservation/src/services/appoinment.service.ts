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
} from '../models/appointment'
import {AppoinmentsSchedulerRepository} from '../respository/appointment-scheduler.repository'
import {AppointmentsBarCodeSequence} from '../respository/appointments-barcode-sequence'
import {
  AppointmentsRepository,
  StatusHistoryRepository,
} from '../respository/appointments-repository'
import moment from 'moment'
import {dateFormats, now} from '../../../common/src/utils/times'
import {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import {flatten} from 'lodash'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {DuplicateDataException} from '../../../common/src/exceptions/duplicate-data-exception'

export class AppoinmentService {
  private dataStore = new DataStore()
  private appoinmentSchedulerRepository = new AppoinmentsSchedulerRepository()
  private appointmentsBarCodeSequence = new AppointmentsBarCodeSequence(new DataStore())
  private appointmentsRepository = new AppointmentsRepository(new DataStore())

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
        value: this.makeTimeEndOfTheDay(moment(queryParams.deadlineDate).utc()),
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
        operator: DataModelFieldMapOperatorType.ArrayContains,
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
    return this.appoinmentSchedulerRepository.getAppointmentByIdFromAcuity(id)
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
    return this.appoinmentSchedulerRepository.updateAppointmentOnAcuity(id, data)
  }

  async cancelAppointmentById(id: number): Promise<AppointmentAcuityResponse> {
    return this.appoinmentSchedulerRepository.cancelAppointmentByIdOnAcuity(id)
  }

  private getUsersGroupRepositoryFor(appointmentId: string) {
    return new StatusHistoryRepository(this.dataStore, appointmentId)
  }

  async addStatusHistoryById(
    appointmentId: string,
    newStatus: AppointmentStatus,
    createdBy: string,
  ): Promise<AppointmentStatusHistoryDb> {
    const appointment = await this.getAppointmentDBById(appointmentId)
    return this.getUsersGroupRepositoryFor(appointmentId).add({
      newStatus: newStatus,
      previousStatus: appointment.appointmentStatus,
      createdOn: now(),
      createdBy,
    })
  }

  async makeInProgress(
    appointmentId: string,
    testRunId: string,
    userId: string,
  ): Promise<AppointmentDBModel> {
    await this.addStatusHistoryById(appointmentId, AppointmentStatus.inProgress, userId)
    return this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.inProgress,
      testRunId,
    })
  }

  async makeReceived(
    appointmentId: string,
    location: string,
    userId: string,
  ): Promise<AppointmentDBModel> {
    await this.addStatusHistoryById(appointmentId, AppointmentStatus.received, userId)
    return this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.received,
      location,
    })
  }

  async addTransportRun(
    appointmentId: string,
    transportRunId: string,
    userId: string,
  ): Promise<AppointmentAttachTransportStatus> {
    try {
      await this.addStatusHistoryById(appointmentId, AppointmentStatus.inTransit, userId)

      await this.appointmentsRepository.updateProperties(appointmentId, {
        transportRunId: transportRunId,
        appointmentStatus: AppointmentStatus.inTransit,
      })
      return AppointmentAttachTransportStatus.Succeed
    } catch (e) {
      return AppointmentAttachTransportStatus.Failed
    }
  }

  async addAppointmentLabel(id: number, data: unknown): Promise<AppointmentAcuityResponse> {
    return this.appoinmentSchedulerRepository.addAppointmentLabelOnAcuity(id, data)
  }

  makeTimeEndOfTheDay(datetime: moment.Moment): string {
    return datetime.hours(11).minutes(59).format()
  }

  async updateAppointmentDB(
    id: string,
    data: Partial<AppointmentDBModel>,
  ): Promise<AppointmentDBModel> {
    return this.appointmentsRepository.updateProperties(id, data)
  }

  async changeStatusToReRunRequired(
    appointmentId: string,
    today: boolean,
  ): Promise<AppointmentDBModel> {
    const utcDateTime = moment().utc()
    const deadline = today
      ? this.makeTimeEndOfTheDay(utcDateTime)
      : this.makeTimeEndOfTheDay(utcDateTime.add(1, 'd'))
    return this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.reRunRequired,
      deadline: deadline,
    })
  }

  async changeStatusToReSampleRequired(appointmentId: string): Promise<AppointmentDBModel> {
    return this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.reSampleRequired,
    })
  }

  async changeStatusToReported(appointmentId: string): Promise<AppointmentDBModel> {
    return this.appointmentsRepository.updateProperties(appointmentId, {
      appointmentStatus: AppointmentStatus.reported,
    })
  }

  async getAppointmentDBByPackageCode(packageCode: string): Promise<AppointmentDBModel[]> {
    return this.appointmentsRepository.findWhereEqual('packageCode', packageCode)
  }
}
