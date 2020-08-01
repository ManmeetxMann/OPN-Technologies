export type Trace = {
  id?: string
  userId: string
  severity: 'YELLOW' | 'RED'
  date: string
  durations: number[]
  accesses: {
    userId: string
    enteredAt: string
    exitAt?: string
    locationId: string
  }[]
}
