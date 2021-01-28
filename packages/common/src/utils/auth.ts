import {AdminProfile} from '../data/admin'
import {User} from '../data/user'

export const getAdminId = (user: User): string => (user.admin ? (user.authUserId as string) : null)

export const getIsLabUser = (user: User): boolean => (user.admin as AdminProfile).isLabUser
