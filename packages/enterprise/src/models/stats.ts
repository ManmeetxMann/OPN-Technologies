import {AccessWithPassportStatusAndUser} from '../../../access/src/models/access'
import {PassportStatus} from '../../../passport/src/models/passport'
import {CheckInsCount} from '../../../access/src/models/access-stats'

export type Stats = {
  asOfDateTime: string
  accesses: AccessWithPassportStatusAndUser[]
  passportsCountByStatus: Record<PassportStatus, number>
  hourlyCheckInsCounts: CheckInsCount[]
  dailyExposuresCount: number
}

export type StatsFilter = {
  groupId?: string
  locationId?: string
  from?: string
  to?: string
}
