export type AppointmentBase = {
  firstName: string
  lastName: string
  email: string
  phone: number
  dateOfBirth: string
}

export type AppoinmentDataUI = {
  findAppoinmentTab: string
  invalidBarCodeNumber?: boolean
  barCode: string
  appointment?: AppointmentDTO
}

export type AppointmentDTO = AppointmentBase

export type AppointmentAcuity = AppointmentBase & {
  id: number
  forms: Array<AppointmentAcuityForm>
}

export type AppointmentAcuityForm = {
  values: Array<AppointmentAcuityFormField>
}

export type AppointmentAcuityFormField = {
  fieldID: number
  value: string
}

export type AppointmentDAO = AppointmentBase & {
  appointmentId: number
}

export type AppointmentFilter = {
  barCodeNumber: string
}

export type AppoinmentBarCodeSequenceDAO = {
  id: string
  barCodeNumber: number
}

export type BarCodeGeneratorUI = {
  barCode?: string
  getNextBarCodeTab: string
}
