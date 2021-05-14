import {Auditable} from '../../../common/src/types/auditable'
import {AuthUser, User as LegacyUser} from '../../../common/src/data/user'

export type UserDTO = {
  id: string
  firstName: string
  lastName: string
  email: string
  photo: string // photo url
  organizationIds: string[]
  isAdminEnabled: boolean
}

export type UserOrganization = Auditable & {
  id: string
  userId: string
  organizationId: string
}

export const userDTOResponse = (
  user: AuthUser | LegacyUser,
  forceAdminEnabled?: boolean,
): UserDTO => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  photo: (user as AuthUser).photo ?? (user as LegacyUser).base64Photo,
  organizationIds: (user as LegacyUser).organizationIds,
  isAdminEnabled: !!(user as LegacyUser).admin || forceAdminEnabled,
})

export type WebhookUserCreateRequest = {
  email: string
  firstName: string
  lastName: string
  address: string
  dateOfBirth: string
  organizationId: string
  agreeToConductFHHealthAssessment: boolean
  shareTestResultWithEmployer: boolean
  readTermsAndConditions: boolean
  receiveResultsViaEmail: boolean
  receiveNotificationsFromGov: boolean
}

export type UserCreateMessage = {
  data: {
    action: string
    data: {email: string}
  }
}
