import AcuityScheduling from '../adapter/acuity'
import {AppointmentAcuityResponse, DeadlineLabel} from '../models/appointment'
import {Certificate} from '../models/packages'
import {AppointmentTypes} from '../models/appointment-types'
import {Calendar} from '../models/calendar'

export class AcuityRepository extends AcuityScheduling {
  constructor() {
    super()
  }

  //Used by Webhooks
  async updateAppointmentOnAcuity(id: number, data: unknown): Promise<AppointmentAcuityResponse> {
    return this.updateAppointmentOnAcuityService(id, data)
  }

  async addAppointmentLabelOnAcuity(
    id: number,
    label: DeadlineLabel,
  ): Promise<AppointmentAcuityResponse> {
    return this.updateAppointmentLabelOnAcuityService(id, label)
  }

  //Used by Webhooks
  async getAppointmentByIdFromAcuity(id: number): Promise<AppointmentAcuityResponse> {
    return this.getAppointmentByIdFromAcuityService(id)
  }

  async cancelAppointmentByIdOnAcuity(id: number): Promise<AppointmentAcuityResponse> {
    return this.cancelAppointmentOnAcuityService(id)
  }

  async getPackagesList(): Promise<Certificate[]> {
    return this.getPackagesFromAcuityService()
  }

  async createCouponCode(couponID: number, emailToLockCoupon: string): Promise<string> {
    const couponCodeResponse = await this.createCouponCodeOnAcuityService(
      couponID,
      emailToLockCoupon,
    )
    return couponCodeResponse.certificate
  }

  getAppointmentTypeList(): Promise<AppointmentTypes[]> {
    return this.getAppointmentTypes()
  }

  getCalendarList(): Promise<Calendar[]> {
    return this.getCalendars()
  }
}
