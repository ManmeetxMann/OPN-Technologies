import fetch from 'node-fetch'

import {Config} from '../../../common/src/utils/config'
import {LogError, LogInfo} from '../../../common/src/utils/logging-setup'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'

import {AppointmentAcuityResponse, DeadlineLabel, Gender} from '../models/appointment'
import {Certificate} from '../models/packages'
import {AcuityCouponCodeResponse, CouponCheckResponse} from '../models/coupons'
import {AppointmentTypes} from '../models/appointment-types'
import {Calendar} from '../models/calendar'
import {AcuityAvailableSlots} from '../models/acuity'
import {getDateDefaultHumanReadable} from '../utils/datetime.helper'

const API_USERNAME = Config.get('ACUITY_SCHEDULER_USERNAME')
const API_PASSWORD = Config.get('ACUITY_SCHEDULER_PASSWORD')
const APIURL = Config.get('ACUITY_SCHEDULER_API_URL')

type AcuityFilter = {
  id: string
  value: string
}

abstract class AcuityAdapter {
  private fieldIdMapping = {
    barCodeNumber: Config.get('ACUITY_FIELD_BARCODE'),
    dateOfBirth: Config.get('ACUITY_FIELD_DATE_OF_BIRTH'),
    registeredNursePractitioner: Config.get('ACUITY_FIELD_NURSE_NAME'),
    organizationId: Config.get('ACUITY_FIELD_ORGANIZATION_ID'),
    address: Config.get('ACUITY_FIELD_ADDRESS'),
    addressUnit: Config.get('ACUITY_FIELD_ADDRESS_UNIT'),
    gender: Config.get('ACUITY_FIELD_GENDER'),
    postalCode: Config.get('ACUITY_FIELD_POSTAL_CODE'),
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
    LogInfo(`AcuityAdapterCancel`, 'Requested', {
      acuityID: id,
    })

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
    LogInfo(`AcuityAdapterCancel`, 'Success', {
      acuityID: id,
    })
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
    LogInfo(`AcuityAdapterUpdateAppointment`, 'Success', {
      acuityID: id,
    })
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

    LogInfo(`AcuityAdapterUpdateLabel`, 'Success', {
      acuityID: id,
      label,
    })
    return this.customFieldsToAppoinment(result)
  }

  protected async getAppointmentByIdFromAcuityService(
    id: number,
  ): Promise<AppointmentAcuityResponse> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = APIURL + `/api/v1/appointments/${id}`

    LogInfo(`AcuityAdapterGetAppointment`, 'Request', {
      acuityID: id,
    })

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
      LogError(
        `AppointmentWebhookController:syncAppointmentFromAcuityToDB`,
        'InvalidAcuityIDPosted',
        {
          acuityID: id,
          acuityStatusCode: result.status_code,
          errorMessage: result.message,
        },
      )
      throw new BadRequestException(result.message)
    }
    return this.customFieldsToAppoinment(result)
  }

  protected async getPackagesFromAcuityService(): Promise<Certificate[]> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = APIURL + `/api/v1/certificates`
    LogInfo(`AcuityAdapterGetcertificates`, 'Request', {})

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
    LogInfo(`AcuityAdapterGetAppointmentTypes`, 'Request', {})

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
    LogInfo(`AcuityAdapterGetCalendar`, 'Request', {})
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

  protected async checkCouponCode(
    certificate: string,
    appointmentTypeID: number,
  ): Promise<CouponCheckResponse> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = encodeURI(
      APIURL +
        `/api/v1/certificates/check?certificate=${certificate}&appointmentTypeID=${appointmentTypeID}`,
    )
    LogInfo(`AcuityAdapterGetCalendar`, 'Request', {})
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
    LogInfo(`AcuityAdapterCreateCoupon`, 'Success', {
      couponID: couponID,
      email: emailToLockCoupon,
    })
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
    calendarID: number,
    fields: Record<string, string | boolean | number[]>,
  ): Promise<AppointmentAcuityResponse> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = `${APIURL}/api/v1/appointments`
    const data = {
      datetime,
      appointmentTypeID,
      calendarID,
      firstName,
      lastName,
      email,
      phone,
      certificate,
      fields: this.handleBooleans(this.renameKeysToId(fields)), // [{id: 1, value: 'Party time!'}]
    }

    LogInfo(`AcuityAdapterCreateAppointment`, 'Request', data)
    const res = await fetch(apiUrl, {
      method: 'post',
      headers: {
        Authorization: 'Basic ' + userPassBase64,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (result.status_code) {
      LogError(`AcuitySchedulingAdapterUpdateAppointment`, 'Failed', {
        appointmentDateTime: datetime,
        acuityStatusCode: result.status_code,
        errorMessage: result.message,
      })
      if (result.error === 'not_available') {
        throw new BadRequestException(
          `${getDateDefaultHumanReadable(datetime)} is not available for appointments`,
        )
      } else if (result.error === 'certificate_uses') {
        throw new BadRequestException(
          `You organization has no more appointment credits left on account. Please contact your account manager.`,
        )
      }
      throw new BadRequestException(result.message)
    }
    LogInfo(`AcuityAdapterCreateAppointment`, 'Success', {
      email,
      acuityID: result.id,
    })
    return this.customFieldsToAppoinment(result)
  }

  protected async getAvailabilityDatesList(
    appointmentTypeID: number,
    calendarID: number,
    month: string,
    timezone?: string,
  ): Promise<{date: string}[]> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = encodeURI(
      APIURL +
        `/api/v1/availability/dates?appointmentTypeID=${appointmentTypeID}&calendarID=${calendarID}&month=${month}` +
        (timezone ? '&timezone=' + timezone : ''),
    )

    LogInfo(`AcuityAdapterGetAvailbilityDates`, 'Success', {
      appointmentTypeID,
      month,
      calendarID,
      timezone,
    })
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
    timezone?: string,
  ): Promise<AcuityAvailableSlots[]> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = encodeURI(
      APIURL +
        `/api/v1/availability/times?appointmentTypeID=${appointmentTypeID}&date=${date}&calendarID=${calendarID}` +
        (timezone ? '&timezone=' + timezone : ''),
    )
    LogInfo(`AcuityAdapterGetAvailbilitySlots`, 'Success', {
      appointmentTypeID,
      date,
      calendarID,
      timezone,
    })
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

  protected async rescheduleAppoinmentService(
    id: number,
    datetime: string,
  ): Promise<AppointmentAcuityResponse> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = `${APIURL}/api/v1/appointments/${id}/reschedule?admin=true`

    const res = await fetch(apiUrl, {
      method: 'put',
      headers: {
        Authorization: 'Basic ' + userPassBase64,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        datetime,
      }),
    })
    const appointment = await res.json()
    if (appointment.status_code) {
      LogError(`AcuitySchedulingAdapterUpdateAppointment`, 'Failed', {
        acuityID: id,
        appointmentDateTime: datetime,
        acuityStatusCode: appointment.status_code,
        errorMessage: appointment.message,
      })
      throw new BadRequestException(appointment.message)
    }
    LogInfo(`AcuitySchedulingAdapterUpdateAppointment`, 'Success', {
      acuityID: id,
    })
    return this.customFieldsToAppoinment(appointment)
  }

  private customFieldsToAppoinment(
    appointment: AppointmentAcuityResponse,
  ): AppointmentAcuityResponse {
    //appointment.dateOfBirth = ''//Required
    appointment.organizationId = null
    appointment.registeredNursePractitioner = ''
    appointment.address = ''
    appointment.addressUnit = ''
    appointment.agreeToConductFHHealthAssessment = false
    appointment.readTermsAndConditions = false
    appointment.receiveResultsViaEmail = false
    appointment.shareTestResultWithEmployer = false
    appointment.receiveNotificationsFromGov = false
    appointment.swabMethod = 'Deep Nasal'
    appointment.ohipCard = ''
    appointment.travelIDIssuingCountry = ''
    appointment.travelID = ''
    appointment.gender = null
    appointment.postalCode = ''

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
          if (
            field.fieldID ==
            Number(Config.get('ACUITY_FIELD_AGREE_TO_CONDUCT_FH_HEALTH_ACCESSMENT'))
          ) {
            appointment.agreeToConductFHHealthAssessment = field.value === 'yes'
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_TRAVEL_ID'))) {
            appointment.travelID = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_TRAVEL_ID_ISSUEING_COUNTRY'))) {
            appointment.travelIDIssuingCountry = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_OHIP_CARD')) && field.value) {
            appointment.ohipCard = field.value
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_SWAB_METHOD'))) {
            if (!!field.value) {
              appointment.swabMethod = field.value
            }
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_GENDER'))) {
            appointment.gender = field.value as Gender
          }
          if (field.fieldID == Number(Config.get('ACUITY_FIELD_POSTAL_CODE'))) {
            appointment.postalCode = field.value
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

export default AcuityAdapter
