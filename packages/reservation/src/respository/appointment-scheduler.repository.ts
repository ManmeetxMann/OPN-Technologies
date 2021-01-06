import AcuityScheduling from '../adapter/acuity'
import {AppointmentAcuityResponse} from '../models/appointment'
import {Certificate} from '../models/packages'

export class AppoinmentsSchedulerRepository extends AcuityScheduling {
  constructor() {
    super()
  }

  //Used by Webhooks
  async updateAppointmentOnAcuity(id: number, data: unknown): Promise<AppointmentAcuityResponse> {
    return this.updateAppointmentOnAcuityService(id, data)
  }

  async addAppointmentLabelOnAcuity(id: number, data: unknown): Promise<AppointmentAcuityResponse> {
    return this.updateAppointmentLabel(id, data)
  }

  //Used by Webhooks
  async getAppointmentByIdFromAcuity(id: number): Promise<AppointmentAcuityResponse> {
    return this.getAppointmentByIdFromAcuityService(id)
  }

  async cancelAppointmentByIdOnAcuity(id: number): Promise<AppointmentAcuityResponse> {
    return this.cancelAppointmentOnAcuity(id)
  }

 getPackagesList(): Promise<Certificate[]> {
    return this.getPackages()
  }
}
