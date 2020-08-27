export type AccessStats = {
  peopleOnPremises: number
  accessDenied: number
  asOfDate: Date
  exposures: number
  pendingPassports: number
  proceedPassports: number
  cautionPassports: number
  stopPassports: number
  checkInsPerHour: {date: Date; count: number}[]
}
