import {ResultTypes} from '../../../reservation/src/models/appointment'
import {TemperatureStatuses} from '../../../reservation/src/models/temperature'
import {PassportStatuses} from '../../../passport/src/models/passport'
import {PulseOxygenStatuses} from '../../../reservation/src/models/pulse-oxygen'

export enum HealthPassType {
  Attestation = 'Attestation',
  Temperature = 'Temperature',
  PCR = 'PCR',
  Pulse = 'Pulse',
}

export type HealthPass = {
  expiry: string
  tests: {
    id: string
    date: string
    type: HealthPassType
    status: PassportStatuses | TemperatureStatuses | ResultTypes | PulseOxygenStatuses
    style: string
  }[]
  status: PassportStatuses
}
