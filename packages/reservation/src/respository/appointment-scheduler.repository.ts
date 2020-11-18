import AcuityScheduling from '../adapter/acuity'
import {
  AppointmentSearchRequest,
  AppointmentDBModel,
  AppointmentAcuityResponse,
  AppointmentSearchByDateRequest,
} from '../models/appoinment'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'

export class AppoinmentsSchedulerRepository extends AcuityScheduling {
  constructor() {
    super()
  }

  async addBarcodeAppointment(
    id: number,
    barCodeNumber: string,
  ): Promise<AppointmentAcuityResponse> {
    return this.updateAppointment(id, {
      barCodeNumber,
    })
  }

  async getManyAppointments(data: AppointmentSearchByDateRequest): Promise<AppointmentDBModel[]> {
    return this.getAppointments(data).then((appointments: AppointmentAcuityResponse[]) => {
      if (!appointments.length) {
        throw new ResourceNotFoundException(`Appointment not found`)
      }

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
    })
  }

  async getAppointment(data: AppointmentSearchRequest): Promise<AppointmentDBModel> {
    return this.getAppointments(data).then((appointments: AppointmentAcuityResponse[]) => {
      if (appointments.length > 1) {
        throw new BadRequestException(
          `Sorry, Results are not sent. Same Barcode is used by multiple appointments`,
        )
      }

      if (!appointments.length) {
        throw new ResourceNotFoundException(`Appointment not found`)
      }

      const {
        firstName,
        lastName,
        email,
        phone,
        id,
        dateOfBirth,
        registeredNursePractitioner,
        date,
        time,
      } = appointments[0]


      return {
        firstName,
        lastName,
        email,
        phone,
        appointmentId: id,
        dateOfBirth,
        registeredNursePractitioner,
        dateOfAppointment: date,
        timeOfAppointment: time,
      }

    })
  }
}
