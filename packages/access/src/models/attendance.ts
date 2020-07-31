export type Attendance = {
  id?: string
  date: string
  accesses: {
    userId: string
    enteredAt: string
    exitAt?: string
  }[]
}
