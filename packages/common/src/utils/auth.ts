import {AdminProfile} from '../data/admin'
import {LocalUser} from '../data/user'

export const getAdminId = (user: {admin: AdminProfile}): string => user.admin.authUserId

export const getIsLabUser = (user: {admin: AdminProfile}): boolean => user.admin.isLabUser

export const getOrganizationId = (user: LocalUser): string => user.organizationIds[0]

export const getUserId = (user: LocalUser): string => user.id
