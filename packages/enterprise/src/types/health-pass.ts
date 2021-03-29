import {ResultTypes} from '../../../reservation/src/models/appointment'
import {TemperatureStatuses} from '../../../reservation/src/models/temperature'
import {PassportStatuses} from '../../../passport/src/models/passport'

export enum HealthPassType {
  Attestation = 'Attestation',
  Temperature = 'Temperature',
  PCR = 'PCR',
}

export type HealthPass = {
  expiry: string
  tests: {
    id: string
    date: string
    type: HealthPassType
    status: PassportStatuses | TemperatureStatuses | ResultTypes
    style: string
  }[]
  status: PassportStatuses
}
