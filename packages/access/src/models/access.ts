import {firestore} from 'firebase-admin'
import {PassportStatus} from '../../../passport/src/models/passport'
import {Range} from '../../../common/src/types/range'
import {User} from '../../../common/src/data/user'

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
  >,
  delegateAdminUserId?: string
}

export type AccessFilter = {
  userIds?: string[]
  locationId?: string
  betweenCreatedDate?: Range<Date>
}
