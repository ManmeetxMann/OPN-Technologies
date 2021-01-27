import {AdminProfile} from '../data/admin'
import {User} from '../data/user'

export const getAdminId = (user: {admin: AdminProfile}): string => user.admin.authUserId

export const getIsLabUser = (user: {admin: AdminProfile}): boolean => user.admin.isLabUser

export const getUserId = (user: User): string => user.id
