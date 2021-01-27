import {AdminProfile} from '../data/admin'
import {User} from '../../../enterprise/src/models/user'

export const getAdminId = (user: {admin: AdminProfile}): string => user.admin.authUserId

export const getIsLabUser = (user: {admin: AdminProfile}): boolean => user.admin.isLabUser

export const getOrganizationId = (user: User): string => user.organizationIds[0]

export const getUserId = (user: User): string => user.id
