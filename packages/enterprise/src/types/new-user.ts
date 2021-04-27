import {Phone} from '../../../common/src/types/phone'

export enum UserLogsEvents {
  findOrCreateUser = 'findOrCreateUser',
  createUser = 'createUser',
  updateUser = 'updateUser',
  create = 'create',
  update = 'update',
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
