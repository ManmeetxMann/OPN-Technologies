export type AppointmentDTO = {
  firstName: string
  lastName: string
  email: string
  phone: number
}

export type AppointmentAcuity = {
  firstName: string
  lastName: string
  email: string
  phone: number
  id: number
}

export type AppointmentDAO = {
  firstName: string
  lastName: string
  email: string
  phone: number
  appointmentId: number
}

export type AppointmentFilter = {
  barCodeNumber: number
}
