type AppointmentBase = {
  firstName: string
  lastName: string
  email: string
  phone: number
  dateOfBirth: string
  registeredNursePractitioner: string
  dateOfAppointment: string
  appointmentId: number
  barCode?: string
}

export type AppoinmentDataUI = {
  findAppoinmentTab: string
  invalidBarCodeNumber?: boolean
  barCode: string
  appointment?: AppointmentDTO
}

export type AppointmentDTO = AppointmentBase

export type AppointmentDBModel = AppointmentBase

type AppointmentAcuityFormField = {
  fieldID: number
  value: string
}

type AppointmentAcuityForm = {
  values: Array<AppointmentAcuityFormField>
}

//Response From Acuity
export type AppointmentAcuityResponse = AppointmentBase & {
  id: number
  date: string
  forms: Array<AppointmentAcuityForm>
}

export type AppointmentSearchRequest = {
  barCodeNumber: string
}

export type AppointmentSearchByDateRequest = {
  startDate: string,
  endDate: string
}

export type AppoinmentBarCodeSequenceDBModel = {
  id: string
  barCodeNumber: number
}

export type BarCodeGeneratorUI = {
  barCode?: string
  getNextBarCodeTab: string
}

export enum ResultTypes {
  Positive = 'Positive',
  Negative = 'Negative',
}

export type TestResultsBase = {
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

export type TestResultsDTO = TestResultsBase

export type TestResultsDBModel = AppointmentBase &
  TestResultsBase & {
    id: string
  }

export type TestResultsConfirmationRequest = TestResultsBase & {
  needConfirmation?: boolean
}

export type TestResultsAgainRequest = TestResultsBase & {
  sendAgain?: boolean
}

export type CheckAppointmentRequest = {
  from?: string
  to?: string
  barCodes?: string[]
}

export type TestResultsDBModelResponse = TestResultsDBModel & {
  exists: boolean
}
export type TestResultsDTOForEmail = TestResultsBase & AppointmentBase
