export type AccessStats = {
  peopleOnPremises: number
  accessDenied: number
  asOfDateTime: Date
  exposures: number
  pendingPassports: number
  proceedPassports: number
  cautionPassports: number
  stopPassports: number
  checkInsPerHour: {date: Date; count: number}[]
}
