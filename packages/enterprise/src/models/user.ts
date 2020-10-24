import {Auditable} from '../../../common/src/types/auditable'
import {Phone} from '../../../common/src/types/phone'

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
