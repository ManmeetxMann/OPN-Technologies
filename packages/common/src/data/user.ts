import DataModel from '../../../common/src/data/datamodel.base'
import {AdminProfile} from './admin'
import {FieldValue} from '../utils/firebase'
import {Auditable} from '../types/auditable'
import {Phone} from '../types/phone'
import {UserStatus, UserCreator} from './user-status'

// TODO: DEPRECATE
export type User = {
  id: string
  registrationId: string
  firstName: string
  lastName: string
  dateOfBirth?: string
  isEmailVerified?: boolean
  base64Photo: string
  organizationIds?: string[]
  email?: string
  phoneNumber?: string
  admin?: AdminProfile | FieldValue
  authUserId?: string | FieldValue
  delegates: null | string[]
  agreeToConductFHHealthAssessment?: boolean
  shareTestResultWithEmployer?: boolean
  readTermsAndConditions?: boolean
  receiveResultsViaEmail?: boolean
  receiveNotificationsFromGov?: boolean
  // status?: UserStatus
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
  isEmailVerified?: boolean
  active: boolean
  organizationIds: string[]
  authUserId?: string
  email?: string
  phoneNumber?: string
  photo?: string // photo url
  phone?: Phone
  registrationId?: string
  memberId?: string
  stripeCustomerId?: string
  creator?: UserCreator
}

// TODO: this duplicates the user in the enterprise service
export type UserDTO = {
  id: string
  firstName: string
  lastName: string
  email: string
  photo: string // photo url
  organizationIds: string[]
  isAdminEnabled: boolean
  delegates: string[]
}

export const userDTO = (user: AuthUser | User, forceAdminEnabled?: boolean): UserDTO => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  photo: (user as AuthUser).photo ?? (user as User).base64Photo,
  organizationIds: (user as User).organizationIds,
  isAdminEnabled: !!(user as User).admin || forceAdminEnabled,
  delegates: (user as User).delegates ?? [],
})

export {UserStatus, UserCreator}
