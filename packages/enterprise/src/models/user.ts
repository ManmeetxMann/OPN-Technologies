import {Auditable} from '../../../common/src/types/auditable'
import {Phone} from '../../../common/src/types/phone'

export type User = Auditable & {
  id: string
  firstName: string
  lastName: string
  active: boolean
  identifier: string //email, external-id (student id), generated-key

  authId?: string
  email?: string
  photo?: string // photo url
  phone?: Phone
}

export type UserDependency = Auditable & {
  id: string
  userId: string
  parentUserId: string
  status: ConnectionStatus
}

export type UserOrganization = Auditable & {
  id: string
  userId: string
  organizationId: string
  //TODO: status: 'pending' | 'approved' | 'rejected'
}

export type UserGroup = Auditable & {
  id: string
  userId: string
  groupId: string
}

export type ConnectionStatus = 'pending' | 'approved' | 'rejected'

export enum ConnectionStatuses {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

export type UserMatcher = {
  firstName: string
  lastName: string
  identifier?: string
  email?: string
}
