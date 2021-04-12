import {ResultTypes} from '../../../reservation/src/models/appointment'
import {TemperatureStatuses} from '../../../reservation/src/models/temperature'
import {PassportStatuses, PassportType} from '../../../passport/src/models/passport'
import {PulseOxygenStatuses} from '../../../reservation/src/models/pulse-oxygen'

export type HealthPass = {
  expiry: string
  tests: {
    id: string
    date: string
    type: PassportType
    status: PassportStatuses | TemperatureStatuses | ResultTypes | PulseOxygenStatuses
    style: string
  }[]
  status: PassportStatuses
}
