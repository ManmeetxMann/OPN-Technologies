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

export type UserDependency = Auditable & {
  id: string
  userId: string
  parentUserId: string
}

export type UserOrganization = Auditable & {
  id: string
  userId: string
  organizationId: string
}

export type UserOrganizationProfile = Auditable & {
  id: string
  userId: string
  organizationId: string
  memberId: string
}

export type UserGroup = Auditable & {
  id: string
  userId: string
  groupId: string
}

export const userDTOResponse = (user: AuthUser | LegacyUser): UserDTO => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  photo: (user as AuthUser).photo ?? (user as LegacyUser).base64Photo,
  organizationIds: (user as LegacyUser).organizationIds,
  isAdminEnabled: !!(user as LegacyUser).admin,
})
