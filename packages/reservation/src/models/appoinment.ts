export type AppointmentBase = {
  firstName: string
  lastName: string
  email: string
  phone: number
  dateOfBirth: string
  registeredNursePractitioner: string
  dateOfAppointment: string
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
  date: string
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

enum ResultTypes {
  Positive,
  Negative
}

export type TestResultsDTO = {
  barCode: string
  result: ResultTypes
  famEGene: string
  famCt: string
  calRed61RdRpGene: string
  calRed61Ct: string
  quasar670NGene: string
  quasar670Ct: string
  hexIC: string
  hexCt: string
}
