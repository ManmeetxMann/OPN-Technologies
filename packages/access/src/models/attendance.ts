import type {Access} from './access'

export type Attendance = {
  id?: string
  date: string
  accessingUsers: string[]
  accesses: Access[]
}
