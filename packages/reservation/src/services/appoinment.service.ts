import DataStore from '../../../common/src/data/datastore'

import {
  AppointmentDTO,
  AppointmentDBModel,
  AppoinmentBarCodeSequenceDBModel,
  AppointmentFilters,
  AppointmentsDBModel,
  AppointmentDbBase,
  AppointmentStatus,
} from '../models/appoinment'
import {AppoinmentsSchedulerRepository} from '../respository/appointment-scheduler.repository'
import {AppointmentsBarCodeSequence} from '../respository/appointments-barcode-sequence'
import {AppointmentsRepository} from '../respository/appointments-repository'
import {now} from '../../../common/src/utils/times'
import {TransportRunsService} from "./transport-runs.service";
import { ResourceNotFoundException } from '../../../common/src/exceptions/resource-not-found-exception'

export class AppoinmentService {
  private appoinmentSchedulerRepository = new AppoinmentsSchedulerRepository()
  private appointmentsBarCodeSequence = new AppointmentsBarCodeSequence(new DataStore())
  private appointmentsRepository = new AppointmentsRepository(new DataStore())
  private transportRunsService = new TransportRunsService()


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

  async getAppointmentDBById(id: string): Promise<AppointmentsDBModel> {
    return this.appointmentsRepository.get(id);
  }

  async getAppointmentById(id: number): Promise<AppointmentDTO> {
    return this.appoinmentSchedulerRepository.getAppointmentById(id)
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

  async addTransportRun(appointmentId: string, transportRunId: string) {
    const transportRuns = await this.transportRunsService.getByTransportRunId(transportRunId);
    if ( transportRuns.length > 1) {
      console.log(`More than 1 result for the transportRunId ${transportRunId}`)
    } else if (transportRuns.length === 0) {
      throw new ResourceNotFoundException(`Transport Run for the id ${transportRunId} Not found`);
    }
    return this.appointmentsRepository.updateProperties(appointmentId, {
      transportRunId: transportRunId,
      inTransitAt: now(),
      appointmentStatus: AppointmentStatus.inTransit
    })
  }
}
