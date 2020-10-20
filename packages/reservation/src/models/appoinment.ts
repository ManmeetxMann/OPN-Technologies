type AppointmentBase = {
  firstName: string
  lastName: string
  email: string
  phone: number
  dateOfBirth: string
  registeredNursePractitioner: string
  dateOfAppointment: string
  appointmentId: number
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

export type AppoinmentBarCodeSequenceDBModel = {
  id: string
  barCodeNumber: number
}

export type BarCodeGeneratorUI = {
  barCode?: string
  getNextBarCodeTab: string
}

enum ResultTypes {
  Positive,
  Negative,
}

type TestResultsBase = {
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

export type TestResultsDBModelResponse = TestResultsDBModel & {
  exists: boolean
}
export type TestResultsDTOForEmail = TestResultsBase & AppointmentBase
