import DataStore from '../../../common/src/data/datastore'

import {
  AppointmentDTO,
  AppointmentDBModel,
  AppoinmentBarCodeSequenceDBModel,
  AppointmentFilters,
  AppointmentsDBModel,
  AppointmentDbBase,
} from '../models/appoinment'
import {AppoinmentsSchedulerRepository} from '../respository/appointment-scheduler.repository'
import {AppointmentsBarCodeSequence} from '../respository/appointments-barcode-sequence'
import {AppointmentsRepository} from "../respository/appointments-repository";

export class AppoinmentService {
  private appoinmentSchedulerRepository = new AppoinmentsSchedulerRepository()
  private appointmentsBarCodeSequence = new AppointmentsBarCodeSequence(new DataStore());
  private appointmentsRepository = new AppointmentsRepository(new DataStore());

  async getAppoinmentByBarCode(barCodeNumber: string): Promise<AppointmentDTO> {
    const filters = {barCodeNumber: barCodeNumber}
    return this.appoinmentSchedulerRepository
      .getAppointment(filters)
      .then((appoinment: AppointmentDBModel) => {
        return appoinment
      })
  }

  async getAppoinmentDBByBarCode(barCodeNumber: string): Promise<AppointmentsDBModel[]> {
    return this.appointmentsRepository.findWhereEqual("barCode", barCodeNumber)
  }

  async getAppointmentById(id: number): Promise<AppointmentDTO> {
    return this.appoinmentSchedulerRepository.getAppointmentById(id)
  }

  async getAppointmentByOrganizationIdAndSearchParams(
    organizationId: string,
    dateOfAppointment: string,
    searchQuery = '',
  ): Promise<AppointmentDTO[]> {
    const filters: AppointmentFilters = {showall: true}
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
}
