export type AvailableTimeIdParams = {
  appointmentTypeId: number
  calendarTimezone: string
  calendarId: number
  date: string
  time: string
  organizationId: string
  packageCode: string
  calendarName: string
}

export type BookingLocationIdParams = {
  appointmentTypeId: number
  calendarTimezone: string
  calendarId: number
  calendarName: string
  organizationId: string
  packageCode: string
}
