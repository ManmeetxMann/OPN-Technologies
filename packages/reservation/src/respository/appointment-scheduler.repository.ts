import AcuityScheduling from '../adapter/acuity'
import {AppointmentFilter, AppointmentDAO, AppointmentAcuity} from '../models/appoinment'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'

export class AppoinmentsSchedulerRepository extends AcuityScheduling {
  constructor() {
    super()
  }

  async getAppointment(data: AppointmentFilter): Promise<AppointmentDAO> {
    return this.getAppointments(data).then((appointments: AppointmentAcuity[]) => {
      if (appointments.length >= 1) {
        //Pick first item in case Staff made mistake by duplicating BarCodeNumber
        const {firstName, lastName, email, phone, id} = appointments[0]
        if (appointments.length > 1) {
          console.warn(`Duplicate Bar Code!! for Appoinment ${id}`)
        }

        return {
          firstName,
          lastName,
          email,
          phone,
          appointmentId: id,
        }
      }
      throw new ResourceNotFoundException(`Appointment not found`)
    })
  }
}
