import {AdminProfile} from '../data/admin'
import {AuthUser} from '../data/user'

export const getAdminId = (user: {admin: AdminProfile}): string => user.admin.authUserId

export const getIsLabUser = (user: {admin: AdminProfile}): boolean => user.admin.isLabUser

export const getOrganizationId = (user: AuthUser): string => user.organizationIds[0]

export const getUserId = (user: AuthUser): string => user.id
