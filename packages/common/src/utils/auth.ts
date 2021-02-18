import {AdminProfile} from '../data/admin'
import {User} from '../data/user'
import {AuthUser} from '../data/user'

export const getIsLabUser = (user: User): boolean => (user.admin as AdminProfile).isLabUser

export const getUserId = (user: AuthUser): string => user.id
