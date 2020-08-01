import type {Access} from './access'

// access, but with fields we might be able to avoid querying for
export type UserAccess = {
  userId: string
} & Access

export type Attendance = {
  id?: string
  date: string
  accesses: UserAccess[]
}
