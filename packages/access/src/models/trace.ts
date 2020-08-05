import type {Access} from './access'
import {PassportStatuses} from '../../../passport/src/models/passport'
export type Trace = {
  id?: string
  userId: string
  severity: PassportStatuses.Caution | PassportStatuses.Stop
  date: string
  durations: number[]
  accesses: Access[]
}
