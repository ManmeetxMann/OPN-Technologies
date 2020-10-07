export type UserContactTraceReportRequest = {
  userId: string
  parentUserId?: string
  from?: string
  to?: string
}

export type FamilyStatusReportRequest = {
  userId: string
  parentUserId?: string
}