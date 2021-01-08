import {AdminProfile} from '../data/admin'

export const getAdminId = (user: {admin: AdminProfile}): string => user.admin.authUserId
