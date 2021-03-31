export type AcuityAvailableSlots = {
  time: string
  slotsAvailable: number
}

export type CreateAppointmentDTO = {
  dateTime: string
  appointmentTypeID: number
  firstName: string
  lastName: string
  email: string
  phone: string
  packageCode: string
  calendarID: number
  fields: Record<string, string | boolean | number[]>
}
