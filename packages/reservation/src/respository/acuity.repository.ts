import AcuityAdapter from '../adapter/acuity'
import {AppointmentAcuityResponse, DeadlineLabel} from '../models/appointment'
import {Certificate} from '../models/packages'
import {AppointmentTypes} from '../models/appointment-types'
import {Calendar} from '../models/calendar'
import {AcuityAvailableSlots, CreateAppointmentDTO} from '../models/acuity'
import {CouponCheckResponse} from '../models/coupons'

export class AcuityRepository extends AcuityAdapter {
  constructor() {
    super()
  }

  async rescheduleAppoinmentOnAcuity(
    id: number,
    dateTime: string,
  ): Promise<AppointmentAcuityResponse> {
    return this.rescheduleAppoinmentService(id, dateTime)
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

  async checkCoupon(certificate: string, appointmentTypeID: number): Promise<CouponCheckResponse> {
    const couponCode = await this.checkCouponCode(certificate, appointmentTypeID)
    return couponCode
  }

  async createAppointment(
    appointmentData: CreateAppointmentDTO,
  ): Promise<AppointmentAcuityResponse> {
    const {
      dateTime,
      appointmentTypeID,
      firstName,
      lastName,
      email,
      phone,
      packageCode,
      calendarID,
      fields,
    } = appointmentData
    return this.createAppointmentOnAcuityService(
      dateTime,
      appointmentTypeID,
      firstName,
      lastName,
      email,
      phone,
      packageCode,
      calendarID,
      fields,
    )
  }

  getAppointmentTypeList(): Promise<AppointmentTypes[]> {
    return this.getAppointmentTypes()
  }

  getCalendarList(): Promise<Calendar[]> {
    return this.getCalendars()
  }

  getAvailableSlots(
    appointmentTypeId: number,
    date: string,
    calendarId: number,
    calendarTimezone: string,
  ): Promise<AcuityAvailableSlots[]> {
    return this.getAvailableSlotsList(appointmentTypeId, date, calendarId, calendarTimezone)
  }

  async getAvailabilityDates(
    appointmentTypeID: number,
    month: string,
    calendarID: number,
    timezone: string,
  ): Promise<{date: string}[]> {
    return this.getAvailabilityDatesList(appointmentTypeID, calendarID, month, timezone)
  }
}
