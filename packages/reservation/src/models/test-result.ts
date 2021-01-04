import {AppointmentDTO, AppointmentUI, AppointmentBase} from './appoinment'

export type TestResultsUiDTO = {
  id: number
  firstName: string
  lastName: string
  testType: string
  dateTime: string
  barCode: string
}

export enum ResultTypes {
  Positive = 'Positive',
  Negative = 'Negative',
  Pending = 'Pending',
  Detected2019nCoV = '2019-nCoV Detected',
  Invalid = 'Invalid',
  Inconclusive = 'Inconclusive',
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
  resultDate: Date
  packageCode: string
  organizationId: string
}

export type TestResultsDBModel = AppointmentBase &
  TestResultsBase & {
    id: string
    todaysDate?: Date //Deprecated
  }

export type TestResultsConfirmationRequest = TestResultsBase & {
  needConfirmation?: boolean
}

export type TestResultsAgainRequest = TestResultsBase & {
  sendAgain?: boolean
}

export type TestResultForPagination = {
  barCode: string
  firstName: string
  lastName: string
  result: ResultTypes
  resultDate: Date
  dateOfAppointment: string
  timeOfAppointment: string
  testType: string
  id: string
}

export type TestResultsDTOForEmail = TestResultsBase & AppointmentBase

export type SendAndSaveTestResultsRequest = {
  results: TestResultsAgainRequest[]
  from: string
  to: string
  resultDate: Date
}

export const testResultUiDTOResponse = (
  appointment: AppointmentDTO | AppointmentUI,
): TestResultsUiDTO => ({
  id: (appointment as AppointmentUI).acuityAppointmentId,
  firstName: appointment.firstName,
  lastName: appointment.lastName,
  testType: 'PCR',
  barCode: appointment.barCode,
  dateTime: (appointment as AppointmentUI).dateTime,
})
