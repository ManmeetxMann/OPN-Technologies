import fetch from 'node-fetch'
import {Config} from '../../../common/src/utils/config'
import querystring from 'querystring'
import {AppointmentAcuityResponse} from '../models/appointment'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'

const API_USERNAME = Config.get('ACUITY_SCHEDULER_USERNAME')
const API_PASSWORD = Config.get('ACUITY_SCHEDULER_PASSWORD')
const APIURL = Config.get('ACUITY_SCHEDULER_API_URL')

type AcuityFilter = {
  id: string
  value: string
}

abstract class AcuityScheduling {
  private fieldMapping = {
    barCodeNumber: 'field:' + Config.get('ACUITY_FIELD_BARCODE'),
    dateOfBirth: 'field:' + Config.get('ACUITY_FIELD_DATE_OF_BIRTH'),
    registeredNursePractitioner: 'field:' + Config.get('ACUITY_FIELD_NURSE_NAME'),
    organizationId: 'field:' + Config.get('ACUITY_FIELD_ORGANIZATION_ID'),
  }

  private fieldIdMapping = {
    barCodeNumber: Config.get('ACUITY_FIELD_BARCODE'),
    dateOfBirth: Config.get('ACUITY_FIELD_DATE_OF_BIRTH'),
    registeredNursePractitioner: Config.get('ACUITY_FIELD_NURSE_NAME'),
    organizationId: Config.get('ACUITY_FIELD_ORGANIZATION_ID'),
  }

  private labelsIdMapping = {
    SameDay: Config.get('ACUITY_FIELD_SAME_DAY'),
    NextDay: Config.get('ACUITY_FIELD_NEXT_DAY'),
  }

  protected async cancelAppointmentOnAcuity(id: number): Promise<AppointmentAcuityResponse> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl = APIURL + `/api/v1/appointments/${id}/cancel`
    console.log(apiUrl) //To know request path for dependency

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

    return this.customFieldsToAppoinment(appointment)
  }

  protected async updateAppointmentLabel(
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
        labels: this.renameLabelKeysToId(fields),
      }),
    })
    const result = await res.json()
    if (result.status_code) {
      throw new BadRequestException(result.message)
    }
    return this.customFieldsToAppoinment(result)
  }

  protected async getAppointments(filters: unknown): Promise<AppointmentAcuityResponse[]> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl =
      APIURL + '/api/v1/appointments?max=1000&' + querystring.stringify(this.renameKeys(filters))
    console.log(apiUrl) //To know request path for dependency

    return fetch(apiUrl, {
      method: 'get',
      headers: {
        Authorization: 'Basic ' + userPassBase64,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    }).then((res) => {
      const appointments = res.json()
      return this.mapCustomFieldsToAppoinment(appointments)
    })
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

  private async mapCustomFieldsToAppoinment(
    appoinments: AppointmentAcuityResponse[],
  ): Promise<AppointmentAcuityResponse[]> {
    return (await appoinments).map(this.customFieldsToAppoinment)
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
        })
      })
    }
    return appointment
  }

  private renameKeys(filters) {
    const acuityFilters = {}
    const keys = Object.keys(filters)
    keys.forEach((key) => {
      const newKey = this.fieldMapping[key] ? this.fieldMapping[key] : key
      acuityFilters[newKey] = filters[key]
    })

    return acuityFilters
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

  private renameLabelKeysToId(filters): AcuityFilter[] {
    const acuityFilters = []
    const keys = Object.keys(filters)
    keys.forEach((key) => {
      const newKey = this.labelsIdMapping[key] ? this.labelsIdMapping[key] : key
      acuityFilters.push({
        id: newKey,
      })
    })

    return acuityFilters
  }
}

export default AcuityScheduling
