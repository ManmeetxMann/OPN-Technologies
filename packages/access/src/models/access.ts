import {firestore} from 'firebase-admin'
import {PassportStatus} from '../../../passport/src/models/passport'
import {Range} from '../../../common/src/types/range'
import {User, UserDependant} from '../../../common/src/data/user'

export type AccessWithPassportStatusAndUser = Access & {
  user: User
  status: PassportStatus
}

export type Access = {
  token: string
  statusToken: string
  locationId: string
  userId: string
  createdAt: string
  enteredAt?: string
  exitAt?: string
  includesGuardian: boolean
  dependants: Record<
    string,
    {
      id: string
      enteredAt?: string | firestore.FieldValue
      exitAt?: string | firestore.FieldValue
    }
  >
  delegateAdminUserId?: string
}

export type AccessWithDependantNames = Omit<Access, 'dependants'> & {
  dependants: UserDependant[]
}

export type AccessDTO = {
  token: string
  locationId: string
  enteredAt: string | null
  exitAt: string | null
  includesGuardian: boolean
  dependants: {
    id: string
    firstName: string
    lastName: string
  }[]
}

export type AccessFilter = {
  userIds?: string[]
  locationId?: string
  statusTokens?: string[]
  betweenCreatedDate?: Range<Date>
}

export type AccessStats = {
  peopleOnPremises: number
  accessDenied: number
  asOfDateTime: string
  exposures: number
  pendingPassports: number
  proceedPassports: number
  cautionPassports: number
  stopPassports: number
  checkInsPerHour: AccessStatsCheckInsPerHour[]
}

export type AccessStatsCheckInsPerHour = {
  date: string
  count: number
}

export const accessDTOResponse = (access: AccessWithDependantNames): AccessDTO => ({
  token: access.token,
  locationId: access.locationId,
  enteredAt: access.enteredAt,
  exitAt: access.exitAt,
  includesGuardian: access.includesGuardian,
  dependants: access.dependants?.map((dep) => ({
    id: dep.id,
    firstName: dep.firstName,
    lastName: dep.lastName,
  })),
})
