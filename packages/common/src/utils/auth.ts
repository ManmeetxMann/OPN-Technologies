import {AdminProfile} from '../data/admin'
import {User} from '../data/user'
import {AuthUser} from '../data/user'

export const getIsOpnSuperAdmin = (user: User): boolean =>
  (user.admin as AdminProfile).isOpnSuperAdmin

export const getIsLabUser = (user: User): boolean => (user.admin as AdminProfile).isLabUser

export const getIsClinicUser = (user: User): boolean => (user.admin as AdminProfile).isClinicUser

export const getUserId = (user: AuthUser): string => user.id
