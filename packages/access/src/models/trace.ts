import type {Access} from './access'

export type Trace = {
  id?: string
  userId: string
  severity: 'YELLOW' | 'RED'
  date: string
  durations: number[]
  accesses: Access[]
}
