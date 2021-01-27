import fetch from 'node-fetch'
import {Config} from '../../../common/src/utils/config'
import {AppointmentAcuityResponse, DeadlineLabel} from '../models/appointment'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {Certificate} from '../models/packages'
import {AcuityCouponCodeResponse} from '../models/coupons'
import {AppointmentTypes} from '../models/appointment-types'
import {Calendar} from '../models/calendar'
import {AcuityAvailableSlots} from '../models/acuity'

const API_USERNAME = Config.get('ACUITY_SCHEDULER_USERNAME')
const API_PASSWORD = Config.get('ACUITY_SCHEDULER_PASSWORD')
const APIURL = Config.get('ACUITY_SCHEDULER_API_URL')

type AcuityFilter = {
  id: string
  value: string
}

abstract class AcuityScheduling {
  private fieldIdMapping = {
    barCodeNumber: Config.get('ACUITY_FIELD_BARCODE'),
    dateOfBirth: Config.get('ACUITY_FIELD_DATE_OF_BIRTH'),
    registeredNursePractitioner: Config.get('ACUITY_FIELD_NURSE_NAME'),
    organizationId: Config.get('ACUITY_FIELD_ORGANIZATION_ID'),
    address: Config.get('ACUITY_FIELD_ADDRESS'),
    addressUnit: Config.get('ACUITY_FIELD_ADDRESS_UNIT'),
    addressForTesting: Config.get('ACUITY_FIELD_ADDRESS_FOR_TESTING'),
    additionalAddressNotes: Config.get('ACUITY_FIELD_ADDITIONAL_ADDRESS_NOTES'),
    shareTestResultWithEmployer: Config.get('ACUITY_FIELD_SHARE_TEST_RESULT_WITH_EMPLOYER'),
    readTermsAndConditions: Config.get('ACUITY_FIELD_READ_TERMS_AND_CONDITIONS'),
    receiveResultsViaEmail: Config.get('ACUITY_FIELD_RECEIVE_RESULTS_VIA_EMAIL'),
    agreeToConductFHHealthAssessment: Config.get(
      'ACUITY_FIELD_AGREE_TO_CONDUCT_FH_HEALTH_ACCESSMENT',
    ),
    receiveNotificationsFromGov: Config.get('ACUITY_FIELD_RECEIVE_NOTIFICATIONS_FROM_GOV'),
  }

  private labelsIdMapping = {
    SameDay: Config.get('ACUITY_FIELD_SAME_DAY'),
    NextDay: Config.get('ACUITY_FIELD_NEXT_DAY'),
  }

  protected async cancelAppointmentOnAcuityService(id: number): Promise<AppointmentAcuityResponse> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = APIURL + `/api/v1/appointments/${id}/cancel?admin=true`
    console.log('[ACUITY: Cancel Appointment] ', apiUrl)

    const res = await fetch(apiUrl, {
      method: 'put',
      headers: {
        Authorization: 'Basic ' + userPassBase64,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    })
    const result = await res.json()
    if (result.status_code) {
      throw new BadRequestException(result.message)
    }
    console.log(`AcuityAdapter: cancelAppointmentOnAcuityService Success: AppointmentId: ${id}`)
    return this.customFieldsToAppoinment(result)
  }

  protected async updateAppointmentOnAcuityService(
    id: number,
    fields: unknown,
  ): Promise<AppointmentAcuityResponse> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = `${APIURL}/api/v1/appointments/${id}?admin=true`

    const res = await fetch(apiUrl, {
      method: 'put',
      headers: {
        Authorization: 'Basic ' + userPassBase64,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        fields: this.renameKeysToId(fields),
      }),
    })
    const appointment = await res.json()
    console.log(`AcuityAdapter: updateAppointmentOnAcuityServiceSuccess AppointmentId: ${id}`)
    return this.customFieldsToAppoinment(appointment)
  }

  protected async updateAppointmentLabelOnAcuityService(
    id: number,
    label: DeadlineLabel,
  ): Promise<AppointmentAcuityResponse> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = `${APIURL}/api/v1/appointments/${id}?admin=true`

    const res = await fetch(apiUrl, {
      method: 'put',
      headers: {
        Authorization: 'Basic ' + userPassBase64,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        labels: this.getPayloadForLabels(label),
      }),
    })
    const result = await res.json()
    if (result.status_code) {
      throw new BadRequestException(result.message)
    }
    console.log(
      `AcuityAdapter: updateAppointmentLabelOnAcuityService ${label} for AppointmentId: ${id}`,
    )
    return this.customFieldsToAppoinment(result)
  }

  protected async getAppointmentByIdFromAcuityService(
    id: number,
  ): Promise<AppointmentAcuityResponse> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = APIURL + `/api/v1/appointments/${id}`
    console.log(apiUrl) //To know request path for dependency

    const res = await fetch(apiUrl, {
      method: 'get',
      headers: {
        Authorization: 'Basic ' + userPassBase64,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    })
    const result = await res.json()
    if (result.status_code) {
      throw new BadRequestException(result.message)
    }
    return this.customFieldsToAppoinment(result)
  }

  protected async getPackagesFromAcuityService(): Promise<Certificate[]> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = APIURL + `/api/v1/certificates`
    console.log(apiUrl) //To know request path for dependency

    const res = await fetch(apiUrl, {
      method: 'get',
      headers: {
        Authorization: 'Basic ' + userPassBase64,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    })
    const result = await res.json()
    if (result.status_code) {
      throw new BadRequestException(result.message)
    }
    return result
  }

  protected async getAppointmentTypes(): Promise<AppointmentTypes[]> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = APIURL + `/api/v1/appointment-types`
    console.log('[ACUITY: Get appointment types] ', apiUrl) //To know request path for dependency

    const res = await fetch(apiUrl, {
      method: 'get',
      headers: {
        Authorization: 'Basic ' + userPassBase64,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    })
    const result = await res.json()
    if (result.status_code) {
      throw new BadRequestException(result.message)
    }
    return result
  }

  protected async getCalendars(): Promise<Calendar[]> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = encodeURI(APIURL + `/api/v1/calendars`)
    console.log('[ACUITY: Get calendars] ', apiUrl) //To know request path for dependency

    const res = await fetch(apiUrl, {
      method: 'get',
      headers: {
        Authorization: 'Basic ' + userPassBase64,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    })
    const result = await res.json()
    if (result.status_code) {
      throw new BadRequestException(result.message)
    }
    return result
  }

  protected async createCouponCodeOnAcuityService(
    couponID: number,
    emailToLockCoupon: string,
  ): Promise<AcuityCouponCodeResponse> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = `${APIURL}/api/v1/certificates`

    const res = await fetch(apiUrl, {
      method: 'post',
      headers: {
        Authorization: 'Basic ' + userPassBase64,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        couponID: couponID,
        email: emailToLockCoupon,
      }),
    })
    const result = await res.json()
    if (result.status_code) {
      throw new BadRequestException(result.message)
    }
    console.log(
      `AcuityAdapter: createCouponCodeOnAcuityService Success: For COUPON GROUP ID: ${couponID}`,
    )
    return result
  }

  protected async createAppointmentOnAcuityService(
    datetime: string,
    appointmentTypeID: number,
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    certificate: string,
    fields: Record<string, string | boolean>,
  ): Promise<AppointmentAcuityResponse> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = `${APIURL}/api/v1/appointments`

    const res = await fetch(apiUrl, {
      method: 'post',
      headers: {
        Authorization: 'Basic ' + userPassBase64,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        datetime,
        appointmentTypeID,
        calendarID: 4571103,
        firstName,
        lastName,
        email,
        phone,
        certificate,
        fields: this.handleBooleans(this.renameKeysToId(fields)), // [{id: 1, value: 'Party time!'}]
      }),
    })
    const result = await res.json()
    if (result.status_code) {
      throw new BadRequestException(result.message)
    }
    console.log(`AcuityAdapter: createCouponCodeOnAcuityService Success: For email: ${email}`)
    return this.customFieldsToAppoinment(result)
  }

  protected async getAvailabilityDatesList(
    appointmentTypeID: number,
    month: string,
    calendarID: number,
    timezone: string,
  ): Promise<{date: string}[]> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = encodeURI(
      APIURL +
        `/api/v1/availability/dates?appointmentTypeID=${appointmentTypeID}&month=${month}&calendarID=${calendarID}&timezone=${timezone}`,
    )
    console.log('[ACUITY: Get availability dates list] ', apiUrl) //To know request path for dependency

    const res = await fetch(apiUrl, {
      method: 'get',
      headers: {
        Authorization: 'Basic ' + userPassBase64,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    })
    const result = await res.json()
    if (result.status_code) {
      throw new BadRequestException(result.message)
    }
    return result
  }

  protected async getAvailableSlotsList(
    appointmentTypeID: number,
    date: string,
    calendarID: number,
    timezone: string,
  ): Promise<AcuityAvailableSlots[]> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = encodeURI(
      APIURL +
        `/api/v1/availability/times?appointmentTypeID=${appointmentTypeID}&date=${date}&calendarID=${calendarID}&timezone=${timezone}`,
    )
    console.log('[ACUITY: Get availability slots for date] ', apiUrl) //To know request path for dependency

    const res = await fetch(apiUrl, {
      method: 'get',
      headers: {
        Authorization: 'Basic ' + userPassBase64,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    })
    const result = await res.json()
    if (result.status_code) {
      throw new BadRequestException(result.message)
    }
    return result
  }

  private customFieldsToAppoinment(
    appointment: AppointmentAcuityResponse,
  ): AppointmentAcuityResponse {
    if (Array.isArray(appointment.forms)) {
      appointment.forms.forEach((form) => {
        form.values.some((field) => {
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_DATE_OF_BIRTH'))) {
            appointment.dateOfBirth = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_NURSE_NAME'))) {
            appointment.registeredNursePractitioner = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_BARCODE'))) {
            appointment.barCode = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_ORGANIZATION_ID'))) {
            appointment.organizationId = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_ADDRESS'))) {
            appointment.address = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_ADDRESS_UNIT'))) {
            appointment.addressUnit = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_ADDRESS_FOR_TESTING'))) {
            appointment.addressForTesting = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_ADDITIONAL_ADDRESS_NOTES'))) {
            appointment.additionalAddressNotes = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_SHARE_TEST_RESULT_WITH_EMPLOYER'))) {
            appointment.shareTestResultWithEmployer = field.value === 'yes'
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_READ_TERMS_AND_CONDITIONS'))) {
            appointment.readTermsAndConditions = field.value === 'yes'
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_RECEIVE_RESULTS_VIA_EMAIL'))) {
            appointment.receiveResultsViaEmail = field.value === 'yes'
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_RECEIVE_NOTIFICATIONS_FROM_GOV'))) {
            appointment.receiveNotificationsFromGov = field.value === 'yes'
          }
        })
      })
    }
    return appointment
  }

  private handleBooleans(filters: AcuityFilter[]): AcuityFilter[] {
    return filters.map((filter) => {
      if (typeof filter.value === 'boolean') {
        return {
          ...filter,
          value: filter.value ? 'yes' : 'no',
        }
      }
      return filter
    })
  }

  private renameKeysToId(filters): AcuityFilter[] {
    const acuityFilters = []
    const keys = Object.keys(filters)
    keys.forEach((key) => {
      const newKey = this.fieldIdMapping[key] ? this.fieldIdMapping[key] : key
      acuityFilters.push({
        id: newKey,
        value: filters[key],
      })
    })

    return acuityFilters
  }

  private getPayloadForLabels(label: DeadlineLabel): AcuityFilter[] {
    const acuityFilters = []
    acuityFilters.push({
      id: this.labelsIdMapping[label] ? this.labelsIdMapping[label] : label,
    })
    return acuityFilters
  }
}

export default AcuityScheduling
