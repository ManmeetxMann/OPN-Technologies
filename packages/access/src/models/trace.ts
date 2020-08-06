import {PassportStatuses} from '../../../passport/src/models/passport'
export type Trace = {
  id?: string
  userId: string
  severity: PassportStatuses.Caution | PassportStatuses.Stop
  date: string
  duration: number
  exposures: ExposureReport[]
}

export type ExposureReport = {
  date: string
  locationId: string
  organizationId: string
  overlapping: {
    start: Date
    end: Date
    userId: string
  }[]
}
