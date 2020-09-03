export type AccessStats = {
  peopleOnPremises: number
  accessDenied: number
  asOfDateTime: Date
  exposures: number
  pendingPassports: number
  proceedPassports: number
  cautionPassports: number
  stopPassports: number
  checkInsPerHour: CheckInsCount[]
}

export type CheckInsCount = {date: string; count: number}

export type AccessStatsFilter = {
  locationId: string
  fromDate?: Date
  toDate?: Date
}
