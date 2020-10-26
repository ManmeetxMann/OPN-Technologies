import AcuityScheduling from '../adapter/acuity'
import {
  AppointmentSearchRequest,
  AppointmentDBModel,
  AppointmentAcuityResponse,
  AppointmentSearchByDateRequest,
} from '../models/appoinment'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'

export class AppoinmentsSchedulerRepository extends AcuityScheduling {
  constructor() {
    super()
  }

  async getManyAppointments(data: AppointmentSearchByDateRequest): Promise<AppointmentDBModel[]> {
    return this.getAppointments(data).then((appointments: AppointmentAcuityResponse[]) => {
      return appointments.map((appointment: AppointmentAcuityResponse) => ({
        firstName: appointment.firstName,
        lastName: appointment.lastName,
        email: appointment.email,
        phone: appointment.phone,
        appointmentId: appointment.id,
        dateOfBirth: appointment.dateOfBirth,
        registeredNursePractitioner: appointment.registeredNursePractitioner,
        dateOfAppointment: appointment.date,
        barCode: appointment.barCode,
      }))
      throw new ResourceNotFoundException(`Appointment not found`)
    })
  }

  async getAppointment(data: AppointmentSearchRequest): Promise<AppointmentDBModel> {
    return this.getAppointments(data).then((appointments: AppointmentAcuityResponse[]) => {
      if (appointments.length >= 1) {
        //Pick first item in case Staff made mistake by duplicating BarCodeNumber
        const {
          firstName,
          lastName,
          email,
          phone,
          id,
          dateOfBirth,
          registeredNursePractitioner,
          date,
        } = appointments[0]
        if (appointments.length > 1) {
          console.warn(`Duplicate Bar Code!! for Appoinment ${id}`)
        }

        return {
          firstName,
          lastName,
          email,
          phone,
          appointmentId: id,
          dateOfBirth,
          registeredNursePractitioner,
          dateOfAppointment: date,
        }
      }
      throw new ResourceNotFoundException(`Appointment not found`)
    })
  }
}
