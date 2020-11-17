import {Auditable} from '../../../common/src/types/auditable'
import {Phone} from '../../../common/src/types/phone'
import {User as LegacyUser} from '../../../common/src/data/user'

export type User = Auditable & {
  id: string
  firstName: string
  lastName: string
  active: boolean

  authUserId?: string
  email?: string
  photo?: string // photo url
  phone?: Phone
  registrationId?: string
  memberId?: string
}

export type UserDTO = {
  id: string
  firstName: string
  lastName: string
  email: string
  photo: string // photo url
  organizationIds: string[]
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

export type UserGroup = Auditable & {
  id: string
  userId: string
  groupId: string
}

export const userDTOFrom = (user: User | LegacyUser): UserDTO => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  photo: (user as User).photo ?? (user as LegacyUser).base64Photo,
  organizationIds: (user as LegacyUser).organizationIds,
})
