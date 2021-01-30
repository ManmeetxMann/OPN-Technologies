import {AdminProfile} from '../data/admin'
import {User} from '../data/user'
import {AuthUser} from '../data/user'

export const getAdminId = (user: User): string => (user.admin ? (user.authUserId as string) : null)
export const getIsLabUser = (user: User): boolean => (user.admin as AdminProfile).isLabUser

export const getOrganizationId = (user: AuthUser): string => user.organizationIds[0]
export const getUserId = (user: AuthUser): string => user.id
