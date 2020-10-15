import {PassportStatuses} from '../../../passport/src/models/passport'
import {UserDependant} from '../../../common/src/data/user'
export type StopStatus = PassportStatuses.Caution | PassportStatuses.Stop
export type Trace = {
  id?: string
  userId: string
  includesGuardian: boolean
  dependantIds: string[]
  passportStatus: StopStatus
  date: string
  duration: number
  exposures: ExposureReport[]
  exposedIds: string[]
}

export type ExposureReport = {
  date: string
  locationId: string
  organizationId: string
  overlapping: {
    start: Date
    end: Date
    sourceUserId: string
    sourceDependantId: string | null
    userId: string
    dependant?: UserDependant
  }[]
}
