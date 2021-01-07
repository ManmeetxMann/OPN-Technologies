import {Auditable} from '../../../common/src/types/auditable'
import {Phone} from '../../../common/src/types/phone'
import {User as LegacyUser} from '../../../common/src/data/user'

export type User = Auditable & {
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

export type UserAdmin = User & {
  admin?: Admin
}

export type Admin = {
  email: string
  adminForOrganizationId: string
  enabled: boolean
  nfcAdminForOrganizationIds: string[]
  adminForLocationIds: string[]
  nfcGateKioskAdminForOrganizationIds: string[]
  healthAdminForOrganizationIds: string[]
  showReporting: boolean
  authUserId: string
  isLabAdmin: string
  isOpnSuperAdmin: boolean
  isTestReportsAdmin: boolean
  adminForGroupIds: string[]
  superAdminForOrganizationIds: string[]
  isManagementDashboardAdmin: boolean
  isTestAppointmentsAdmin: boolean
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

export const userDTOResponse = (user: User | LegacyUser): UserDTO => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  photo: (user as User).photo ?? (user as LegacyUser).base64Photo,
  organizationIds: (user as LegacyUser).organizationIds,
})
