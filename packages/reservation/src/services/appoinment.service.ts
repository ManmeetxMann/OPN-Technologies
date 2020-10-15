import DataStore from '../../../common/src/data/datastore'

import {AppointmentDTO, AppointmentDAO, AppoinmentBarCodeSequenceDAO} from '../models/appoinment'
import {AppoinmentsSchedulerRepository} from '../respository/appointment-scheduler.repository'
import {AppoinmentsDBRepository} from '../respository/appointment-db.repository'

export class AppoinmentService {
  private appoinmentSchedulerRepository = new AppoinmentsSchedulerRepository()
  private appoinmentDBRepository = new AppoinmentsDBRepository(new DataStore())

  async getAppoinmentByBarCode(barCodeNumber: string): Promise<AppointmentDTO> {
    const filters = {barCodeNumber: barCodeNumber}
    return this.appoinmentSchedulerRepository
      .getAppointment(filters)
      .then(({phone, firstName, lastName, email, dateOfBirth}: AppointmentDAO) => {
        return {phone, firstName, lastName, email, dateOfBirth}
      })
  }

  async getNextBarCodeNumber(): Promise<string> {
    return this.appoinmentDBRepository
      .getNextBarCode()
      .then(({id, barCodeNumber}: AppoinmentBarCodeSequenceDAO) => {
        return id.concat(barCodeNumber.toString())
      })
  }
}
