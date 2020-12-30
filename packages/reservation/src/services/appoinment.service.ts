import DataStore from '../../../common/src/data/datastore'

import {
  AppoinmentBarCodeSequenceDBModel,
  AppointmentAcuityResponse,
  AppointmentAttachTransportStatus,
  AppointmentByOrganizationRequest,
  AppointmentDbBase,
  AppointmentDBModel,
  AppointmentDTO,
  AppointmentFilters,
  AppointmentsDBModel,
  AppointmentStatus,
} from '../models/appoinment'
import {AppoinmentsSchedulerRepository} from '../respository/appointment-scheduler.repository'
import {AppointmentsBarCodeSequence} from '../respository/appointments-barcode-sequence'
import {AppointmentsRepository} from '../respository/appointments-repository'
import moment from 'moment'
import {dateFormats, now} from '../../../common/src/utils/times'
import {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'
import {flatten} from 'lodash'

export class AppoinmentService {
  private appoinmentSchedulerRepository = new AppoinmentsSchedulerRepository()
  private appointmentsBarCodeSequence = new AppointmentsBarCodeSequence(new DataStore())
  private appointmentsRepository = new AppointmentsRepository(new DataStore())

  async getAppoinmentByBarCode(barCodeNumber: string): Promise<AppointmentDTO> {
    const filters = {barCodeNumber: barCodeNumber}
    return this.appoinmentSchedulerRepository
      .getAppointment(filters)
      .then((appoinment: AppointmentDBModel) => {
        return appoinment
      })
  }

  async getAppoinmentDBByBarCode(barCodeNumber: string): Promise<AppointmentsDBModel[]> {
    return this.appointmentsRepository.findWhereEqual('barCode', barCodeNumber)
  }

  async getAppointmentsDB(
    queryParams: AppointmentByOrganizationRequest,
  ): Promise<AppointmentsDBModel[]> {
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
      ] as AppointmentsDBModel[]
    } else {
      return this.appointmentsRepository.findWhereEqualInMap(conditions)
    }
  }

  async getAppointmentDBById(id: string): Promise<AppointmentsDBModel> {
    return this.appointmentsRepository.get(id)
  }

  async getAppointmentByAcuityId(id: number): Promise<AppointmentsDBModel> {
    const appointments = await this.appointmentsRepository.findWhereEqual('acuityAppointmentId', id)
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

  async getAppointmentByOrganizationIdAndSearchParams(
    organizationId: string,
    dateOfAppointment: string,
    searchQuery = '',
    showCancelled = false,
  ): Promise<AppointmentDTO[]> {
    const filters: AppointmentFilters = {showall: showCancelled}
    if (organizationId) {
      filters.organizationId = organizationId
    }

    if (dateOfAppointment) {
      filters.maxDate = dateOfAppointment
      filters.minDate = dateOfAppointment
    }
    if (!searchQuery) {
      return this.appoinmentSchedulerRepository.getManyAppointments(filters)
    } else {
      const searchPromises = []
      const searchArray = searchQuery.split(' ')
      if (searchArray.length === 1) {
        searchPromises.push(
          this.appoinmentSchedulerRepository.getManyAppointments({
            firstName: searchArray[0],
            ...filters,
          }),
          this.appoinmentSchedulerRepository.getManyAppointments({
            lastName: searchArray[0],
            ...filters,
          }),
        )
      } else {
        searchPromises.push(
          this.appoinmentSchedulerRepository.getManyAppointments({
            firstName: searchArray[0],
            lastName: searchArray[1],
            ...filters,
          }),
          this.appoinmentSchedulerRepository.getManyAppointments({
            firstName: searchArray[1],
            lastName: searchArray[0],
            ...filters,
          }),
        )
      }

      return Promise.all(searchPromises).then((appointmentsArray) => {
        return appointmentsArray.flat()
      })
    }
  }

  async saveAppointmentData(appointment: AppointmentDbBase): Promise<AppointmentsDBModel> {
    return this.appointmentsRepository.save(appointment)
  }

  async getAppoinmentByDate(startDate: string, endDate: string): Promise<AppointmentDTO[]> {
    const filters = {
      minDate: startDate,
      maxDate: endDate,
    }
    return this.appoinmentSchedulerRepository
      .getManyAppointments(filters)
      .then((appoinment: AppointmentDBModel[]) => {
        return appoinment
      })
  }

  async getNextBarCodeNumber(): Promise<string> {
    return this.appointmentsBarCodeSequence
      .getNextBarCode()
      .then(({id, barCodeNumber}: AppoinmentBarCodeSequenceDBModel) => {
        return id.concat(barCodeNumber.toString())
      })
  }

  async updateAppointment(id: number, data: unknown): Promise<AppointmentDTO> {
    return this.appoinmentSchedulerRepository.updateAppointment(id, data)
  }

  async cancelAppointmentById(id: number): Promise<AppointmentDTO> {
    return this.appoinmentSchedulerRepository.cancelAppointmentById(id)
  }

  async addTransportRun(
    appointmentId: string,
    transportRunId: string,
  ): Promise<AppointmentAttachTransportStatus> {
    try {
      await this.appointmentsRepository.updateProperties(appointmentId, {
        transportRunId: transportRunId,
        inTransitAt: now(),
        appointmentStatus: AppointmentStatus.inTransit,
      })
      return AppointmentAttachTransportStatus.Succeed
    } catch (e) {
      return AppointmentAttachTransportStatus.Failed
    }
  }

  async addAppointmentLabel(id: number, data: unknown): Promise<AppointmentAcuityResponse> {
    return this.appoinmentSchedulerRepository.addAppointmentLabel(id, data)
  }

  makeTimeEndOfTheDay(datetime: moment.Moment): string {
    return datetime.hours(11).minutes(59).format()
  }

  async updateAppointmentDB(
    id: string,
    data: Partial<AppointmentsDBModel>,
  ): Promise<AppointmentsDBModel> {
    return this.appointmentsRepository.updateProperties(id, data)
  }
}
