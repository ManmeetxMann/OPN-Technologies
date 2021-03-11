import {PassportStatuses} from './passport'

// records how many users received each status *today*
export type StatusStats = {
  date: string
  organization: string
  group: string
  [PassportStatuses.Stop]: string[]
  [PassportStatuses.Caution]: string[]
  [PassportStatuses.Proceed]: string[]
  [PassportStatuses.TemperatureCheckRequired]: string[]
}
