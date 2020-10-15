import fetch from 'node-fetch'
import {Config} from '../../../common/src/utils/config'
import querystring from 'querystring'
import {AppointmentAcuity} from '../models/appoinment'

const API_USERNAME = Config.get('ACUITY_SCHEDULER_USERNAME')
const API_PASSWORD = Config.get('ACUITY_SCHEDULER_PASSWORD')
const APIURL = Config.get('ACUITY_SCHEDULER_API_URL')

abstract class AcuityScheduling {
  private fieldMapping = {
    barCodeNumber: 'field:8594852',
    dateOfBirth: 'field:8561464',
  }

  protected async getAppointments(filters: unknown): Promise<AppointmentAcuity[]> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl =
      APIURL + '/api/v1/appointments?' + querystring.stringify(this.renameKeys(filters))

    return fetch(apiUrl, {
      method: 'get',
      headers: {
        Authorization: 'Basic ' + userPassBase64,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    }).then((res) => {
      const appointments = res.json()
      return this.addDOB(appointments)
    })
  }

  private async addDOB(appoinments: Promise<AppointmentAcuity[]>) {
    return (await appoinments).map((appointment) => {
      appointment.forms.forEach((form) => {
        form.values.some((field) => {
          if (field.fieldID == 8561464) {
            appointment.dateOfBirth = field.value
            return true
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
