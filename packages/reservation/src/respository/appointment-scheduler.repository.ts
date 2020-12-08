import AcuityScheduling from '../adapter/acuity'
import {
  AppointmentSearchRequest,
  AppointmentDBModel,
  AppointmentAcuityResponse,
  AppointmentRequest,
  AppointmentUI,
} from '../models/appoinment'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'

export class AppoinmentsSchedulerRepository extends AcuityScheduling {
  constructor() {
    super()
  }

  async updateAppoinment(id: number, data: unknown): Promise<AppointmentAcuityResponse> {
    return this.updateAppointment(id, data)
  }

  async getAppointmentById(id: number): Promise<AppointmentDBModel> {
    return this.getAppointmentsById(id).then((appointment: AppointmentAcuityResponse) =>
      this.convertToAppointmentModel(appointment),
    )
  }

  async getManyAppointments(data: AppointmentRequest): Promise<AppointmentDBModel[]> {
    return this.getAppointmentsByFilter(data, true)
  }

  async getAppointment(data: AppointmentSearchRequest): Promise<AppointmentDBModel> {
    return this.getAppointmentsByFilter(data, false).then(
      (appointments: AppointmentAcuityResponse[]) => {
        return appointments[0]
      },
    )
  }

  private async getAppointmentsByFilter(
    filter: AppointmentRequest,
    isMultiple: boolean,
  ): Promise<AppointmentDBModel[]> {
    return this.getAppointments(filter).then((appointments: AppointmentAcuityResponse[]) => {
      if (!appointments.length) {
        throw new ResourceNotFoundException(`Appointment not found`)
      }

      if (appointments.length > 1 && !isMultiple) {
        throw new BadRequestException(
          `Sorry, Results are not sent. Same Barcode is used by multiple appointments`,
        )
      }

      return appointments.map((appointment: AppointmentAcuityResponse) =>
        this.convertToAppointmentModel(appointment),
      )
    })
  }

  private convertToAppointmentModel(appointment: AppointmentAcuityResponse): AppointmentUI {
    return {
      firstName: appointment.firstName,
      lastName: appointment.lastName,
      email: appointment.email,
      phone: appointment.phone,
      appointmentId: appointment.id,
      id: appointment.id,
      dateOfBirth: appointment.dateOfBirth,
      registeredNursePractitioner: appointment.registeredNursePractitioner,
      barCode: appointment.barCode,
      packageCode: appointment.certificate,
      dateOfAppointment: appointment.date,
      timeOfAppointment: appointment.time,
      location: appointment.location,
      canceled: appointment.canceled,
      dateTime: appointment.datetime,
    }
  }
}
