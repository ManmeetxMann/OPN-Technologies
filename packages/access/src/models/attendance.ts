import type {Access} from './access'

export type Attendance = {
  id?: string
  date: string
  accesses: Access[]
}
