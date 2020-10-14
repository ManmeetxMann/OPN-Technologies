import fetch from 'node-fetch'
import {Config} from '../../../common/src/utils/config'
import querystring from 'querystring'

const API_USERNAME = Config.get('ACUITY_SCHEDULER_USERNAME')
const API_PASSWORD = Config.get('ACUITY_SCHEDULER_PASSWORD')
const APIURL = Config.get('ACUITY_SCHEDULER_API_URL')

abstract class AcuityScheduling {
  private fieldMapping = {
    barCodeNumber: 'field:8594852',
  }

  protected async getAppointments(filters: unknown): Promise<unknown> {
    const userPassBuf = Buffer.from(API_USERNAME + ':' + API_PASSWORD)
    const userPassBase64 = userPassBuf.toString('base64')
    const apiUrl =
      APIURL + '/api/v1/appointments?' + querystring.stringify(this.renameKeys(filters))
    console.log(apiUrl)
    return fetch(apiUrl, {
      method: 'get',
      headers: {
        Authorization: 'Basic ' + userPassBase64,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    }).then((res) => res.json())
  }

  private renameKeys(filters) {
    const acuityFilters = {}
    const keys = Object.keys(filters)
    keys.forEach((key) => {
      console.log(this.fieldMapping[key])
      const newKey = this.fieldMapping[key] ? this.fieldMapping[key] : key
      acuityFilters[newKey] = filters[key]
    })
    return acuityFilters
  }
}

export default AcuityScheduling
