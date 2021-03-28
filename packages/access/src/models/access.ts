import {firestore} from 'firebase-admin'
import {PassportStatus} from '../../../passport/src/models/passport'
import {Range} from '../../../common/src/types/range'
import {User, UserDependant} from '../../../common/src/data/user'
import {isPassed, safeTimestamp} from '../../../common/src/utils/datetime-util'

export type AccessWithPassportStatusAndUser = {
  user: User
  status: PassportStatus
  exitAt: string | null
  enteredAt: string | null
  parentUserId: string | null
  locationId: string | null
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

export type AccessDTOV1 = {
  id: string
  token: string
  statusToken: string
  locationId: string
  enteredAt: string | null
  exitAt: string | null
  userId: string
  includesGuardian: boolean
  dependants: {
    id: string
    enteredAt: string | null
    exitAt: string | null
  }[]
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

export const accessDTOResponseV1 = (access: Access & {id: string}): AccessDTOV1 => ({
  id: access.id,
  userId: access.userId,
  token: access.token,
  statusToken: access.statusToken,
  locationId: access.locationId,
  enteredAt: access.enteredAt ? safeTimestamp(access.enteredAt).toISOString() : null,
  exitAt:
    access.exitAt && isPassed(safeTimestamp(access.exitAt))
      ? safeTimestamp(access.exitAt).toISOString()
      : null,
  includesGuardian: access.includesGuardian,
  dependants: (access.dependants
    ? Object.keys(access.dependants).map((id) => access.dependants[id])
    : []
  ).map((dep) => ({
    id: dep.id,
    enteredAt: dep.enteredAt ? safeTimestamp(dep.enteredAt).toISOString() : null,
    exitAt: dep.exitAt ? safeTimestamp(dep.exitAt).toISOString() : null,
  })),
})
