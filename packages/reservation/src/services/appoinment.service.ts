import DataStore from '../../../common/src/data/datastore'

import {
  AppointmentDTO,
  AppointmentDBModel,
  AppoinmentBarCodeSequenceDBModel,
} from '../models/appoinment'
import {AppoinmentsSchedulerRepository} from '../respository/appointment-scheduler.repository'
import {AppoinmentsDBRepository} from '../respository/appointment-db.repository'

export class AppoinmentService {
  private appoinmentSchedulerRepository = new AppoinmentsSchedulerRepository()
  private appoinmentDBRepository = new AppoinmentsDBRepository(new DataStore())

  async getAppoinmentByBarCode(barCodeNumber: string): Promise<AppointmentDTO> {
    const filters = {barCodeNumber: barCodeNumber}
    return this.appoinmentSchedulerRepository
      .getAppointment(filters)
      .then((appoinment: AppointmentDBModel) => {
        return appoinment
      })
  }

  async getAppointmentById(id: number, isNeedToConvert = false): Promise<AppointmentDTO> {
    return this.appoinmentSchedulerRepository.getAppointmentById(id, isNeedToConvert)
  }

  async getAppoinmentByOrganizationId(organizationId: string): Promise<AppointmentDTO[]> {
    const filters = {organizationId}
    return this.appoinmentSchedulerRepository
      .getManyAppointments(filters)
      .then((appoinment: AppointmentDBModel[]) => {
        return appoinment
      })
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
    return this.appoinmentDBRepository
      .getNextBarCode()
      .then(({id, barCodeNumber}: AppoinmentBarCodeSequenceDBModel) => {
        return id.concat(barCodeNumber.toString())
      })
  }

  async updateAppoinment(id: number, data: unknown): Promise<AppointmentDTO> {
    return this.appoinmentSchedulerRepository.updateAppoinment(id, data)
  }
}
