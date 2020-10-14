import {AppointmentDTO, AppointmentDAO} from '../models/appoinment'
import {AppoinmentsRepository} from '../respository/appointment.repository'

export class AppoinmentService {
  private appoinmentsRepository = new AppoinmentsRepository()

  async getAppoinmentByBarCode(barCodeNumber: number): Promise<AppointmentDTO> {
    const filters = {barCodeNumber: barCodeNumber}
    return this.appoinmentsRepository
      .getAppointment(filters)
      .then(({phone, firstName, lastName, email}: AppointmentDAO) => {
        return {phone, firstName, lastName, email}
      })
  }
}
