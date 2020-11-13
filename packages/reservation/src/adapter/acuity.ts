import fetch from 'node-fetch'
import {Config} from '../../../common/src/utils/config'
import querystring from 'querystring'
import {AppointmentAcuityResponse} from '../models/appoinment'

const API_USERNAME = Config.get('ACUITY_SCHEDULER_USERNAME')
const API_PASSWORD = Config.get('ACUITY_SCHEDULER_PASSWORD')
const APIURL = Config.get('ACUITY_SCHEDULER_API_URL')

abstract class AcuityScheduling {
  private fieldMapping = {
    barCodeNumber: 'field:' + Config.get('ACUITY_FIELD_BARCODE'),
    dateOfBirth: 'field:' + Config.get('ACUITY_FIELD_DATE_OF_BIRTH'),
    registeredNursePractitioner: 'field:' + Config.get('ACUITY_FIELD_NURSE_NAME'),
  }

  protected async getAppointments(filters: unknown): Promise<AppointmentAcuityResponse[]> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl =
      APIURL + '/api/v1/appointments?max=500&' + querystring.stringify(this.renameKeys(filters))
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

  private async mapCustomFieldsToAppoinment(appoinments: Promise<AppointmentAcuityResponse[]>) {
    return (await appoinments).map((appointment) => {
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
        })
      })
      return appointment
    })
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
}

export default AcuityScheduling
