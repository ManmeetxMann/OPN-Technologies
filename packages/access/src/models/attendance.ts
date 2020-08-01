export type Attendance = {
  id?: string
  date: string
  accessingUsers: string[]
  accesses: {
    userId: string
    enteredAt: string
    exitAt?: string
  }[]
}
