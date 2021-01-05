import {ResultTypes} from './appointment'

export type TestResultsUiDTO = {
  id: number
  firstName: string
  lastName: string
  testType: string
  dateTime: string
  barCode: string
}

type ClientDetails = {
  firstName: string
  lastName: string
  email: string
  phone: number
  dateOfBirth: string
  registeredNursePractitioner?: string
  dateOfAppointment: string
  appointmentId?: number
  timeOfAppointment?: string
  barCode?: string
  dateTime: string
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

export type TestResultsDBModel = ClientDetails &
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

export type TestResultsDTOForEmail = TestResultsBase & ClientDetails

export type SendAndSaveTestResultsRequest = {
  results: TestResultsAgainRequest[]
  from: string
  to: string
  resultDate: Date
}

export const testResultUiDTOResponse = (appointment: ClientDetails): TestResultsUiDTO => ({
  id: appointment.appointmentId,
  firstName: appointment.firstName,
  lastName: appointment.lastName,
  testType: 'PCR',
  barCode: appointment.barCode,
  dateTime: appointment.dateTime,
})
