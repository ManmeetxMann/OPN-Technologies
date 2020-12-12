import DataModel from '../../../common/src/data/datamodel.base'
import {AdminProfile} from './admin'
import {FieldValue} from '../utils/firebase'

export type UserCache = {
  passports?: Record<
    string,
    {
      id: string
      statusToken: string
      status: 'pending' | 'proceed' | 'caution' | 'stop'
      validFrom: Date | FieldValue
      validUntil: Date | FieldValue
    }
  >
}

// TODO: DEPRECATE
export type User = {
  id: string
  registrationId: string
  firstName: string
  lastName: string
  base64Photo: string
  organizationIds?: string[]
  email?: string
  admin?: AdminProfile | FieldValue
  authUserId?: string | FieldValue
  delegates: null | string[]
  cache?: UserCache
}

export type UserWithGroup = {
  groupId?: string
} & User

export type UserEdit = {
  // id: string
  firstName: string
  lastName: string
  base64Photo?: string
  parentUserId?: string
  // groupId?: string
}

export type UserFilter = {
  userIds: string[]
}

// TODO: DEPRECATE
export type UserDependant = User
export type LegacyDependant = {
  id: string
  firstName: string
  lastName: string
  groupId: string
}

// TODO: DEPRECATE
export class UserModel extends DataModel<User> {
  public readonly rootPath = 'users'
  readonly zeroSet = []
}
