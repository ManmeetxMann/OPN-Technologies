import AcuityScheduling from '../adapter/acuity'
import {
  AppointmentAcuityResponse,
  AppointmentBase,
} from '../models/appointment'

export class AppoinmentsSchedulerRepository extends AcuityScheduling {
  constructor() {
    super()
  }

  //Used by Webhooks
  async updateAppointment(id: number, data: unknown): Promise<AppointmentBase> {
    return this.updateAppointmentOnAcuity(id, data).then((appointment: AppointmentAcuityResponse) => {
      return this.convertToAppointmentModel(appointment)
    })
  }

  async addAppointmentLabel(id: number, data: unknown): Promise<AppointmentBase> {
    return this.updateAppointmentLabel(id, data).then((appointment: AppointmentAcuityResponse) => {
      return this.convertToAppointmentModel(appointment)
    })
  }

  //Used by Webhooks
  async getAppointmentById(id: number): Promise<AppointmentBase> {
    return this.getAppointmentsById(id).then((appointment: AppointmentAcuityResponse) => {
      return this.convertToAppointmentModel(appointment)
    })
  }

  async cancelAppointmentById(id: number): Promise<AppointmentBase> {
    return this.cancelAppointment(id).then((appointment: AppointmentAcuityResponse) => {
      return this.convertToAppointmentModel(appointment)
    })
  }

  private convertToAppointmentModel(appointment: AppointmentAcuityResponse): AppointmentBase {
    return {
      firstName: appointment.firstName,
      lastName: appointment.lastName,
      email: appointment.email,
      phone: appointment.phone,
      acuityAppointmentId: appointment.id,
      dateOfBirth: appointment.dateOfBirth,
      registeredNursePractitioner: appointment.registeredNursePractitioner,
      barCode: appointment.barCode,
      packageCode: appointment.certificate,
      dateOfAppointment: appointment.date,
      timeOfAppointment: appointment.time,
      location: appointment.location,
      organizationId: appointment.organizationId ?? null,
      canceled: appointment.canceled,
      dateTime: appointment.datetime,
    }
  }
}
