import {Phone} from '../../../common/src/types/phone'

export enum UserLogsEvents {
  updateDependent = 'updateDependent',
  updateDependentError = 'updateDependentError',
  createUser = 'createUser',
  createUserError = 'createUserError',
  connectUserError = 'connectUserError',
  updateUser = 'updateUser',
  updateUserError = 'updateUserError',
}

export enum UserLogsFunctions {
  findOrCreateUser = 'findOrCreateUser',
  updateDependent = 'updateDependent',
  createUser = 'createUser',
  updateUser = 'updateUser',
  create = 'create',
  update = 'update',
  connect = 'connect',
  userEdit = 'userEdit',
  userLink = 'userLink',
}

export type NewUser = {
  email: string
  firstName: string
  lastName: string
  registrationId: string
  photo?: string //url
  phone?: Phone
  authUserId?: string
  active?: boolean
  memberId?: string
  organizationId: string
}

export type CreateUserRequest = NewUser & {
  idToken: string
}

export type MigrateUserRequest = {
  email: string
  firstName: string
  lastName: string
  registrationId: string
  legacyProfiles: LegacyProfile[]
  photo?: string //url
}

export type LegacyProfile = {
  userId: string
  organizationId: string
  groupId: string
  dependentIds?: string[]
}

export type CreateUserByAdminRequest = {
  email: string
  firstName: string
  lastName: string
  registrationId: string
  photo: string
  organizationId: string
  groupId: string
  memberId: string
}
