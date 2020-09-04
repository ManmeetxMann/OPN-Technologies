import type {Access} from './access'

type SinglePersonAccess = Access & {
  dependantId: string | null
}

export type Attendance = {
  id?: string
  date: string
  accessingUsers: string[]
  accesses: SinglePersonAccess[]
}
