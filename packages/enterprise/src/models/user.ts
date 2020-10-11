import {Auditable} from '../../../common/src/types/auditable'
import {Phone} from '../../../common/src/types/phone'

export type User = Auditable & {
  id: string
  firstName: string
  lastName: string
  active: boolean

  authId?: string
  email?: string
  photo?: string // photo url
  phone?: Phone
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
  //TODO: status: 'pending' | 'connected' | 'rejected'
}

export type UserGroup = Auditable & {
  id: string
  userId: string
  groupId: string
}
