import DataModel from '../../../common/src/data/datamodel.base'
import {AdminProfile} from './admin'
import {FieldValue} from '../utils/firebase'
import {Auditable} from '../types/auditable'
import {Phone} from '../types/phone'

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
}

export type LocalUser = Auditable & {
  id: string
  firstName: string
  lastName: string
  active: boolean
  organizationIds: string[]
  authUserId?: string
  email?: string
  photo?: string // photo url
  phone?: Phone
  registrationId?: string
  memberId?: string
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

export type AuthUser = Auditable & {
  id: string
  firstName: string
  lastName: string
  active: boolean
  organizationIds: string[]
  authUserId?: string
  email?: string
  photo?: string // photo url
  phone?: Phone
  registrationId?: string
  memberId?: string
}