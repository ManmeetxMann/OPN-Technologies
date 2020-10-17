import {Phone} from '../../../common/src/types/phone'

export type CreateUserRequest = {
  email: string
  firstName: string
  lastName: string
  registrationId: string

  photo?: string //url
  phone?: Phone
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
