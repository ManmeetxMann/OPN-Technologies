import {AdminProfile} from '../data/admin'

export const getAdminId = (user: {admin: AdminProfile}): string => user.admin.authUserId

export const getIsLabUser = (user: {admin: AdminProfile}): boolean => user.admin.isLabUser
