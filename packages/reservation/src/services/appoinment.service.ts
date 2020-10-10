import {Appointment} from '../models/appoinment'
import {AppoinmentsRepository} from '../respository/appointment.repository'

export class AppoinmentService {
  private appoinmentsRepository = new AppoinmentsRepository()

  async searchAppoinmentsForPhoneAndAppoinmentDate(
    phoneNumber: number,
    dateOfAppointment: string,
  ): Promise<Array<Appointment>> {
    const filters = {
      phoneNumber: phoneNumber,
      dateOfAppointment: dateOfAppointment,
    }

    return this.appoinmentsRepository.getFilteredAppointments(filters).then((results: []) => {
      return results.map((appoinment: Appointment) => {
        const appoinmentData: Appointment = {
          phone: appoinment.phone,
          firstName: appoinment.firstName,
          lastName: appoinment.lastName,
          email: appoinment.email,
        }
        return appoinmentData
      })
    })
  }
}
