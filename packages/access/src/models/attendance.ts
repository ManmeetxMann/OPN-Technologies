import type {Access} from './access'
import type {UserDependant} from '../../../common/src/data/user'

export type SinglePersonAccess = Access & {
  dependantId: string | null
  dependant: UserDependant | null
}

export type Attendance = {
  id?: string
  date: string
  accessingUsers: string[]
  accesses: SinglePersonAccess[]
}
