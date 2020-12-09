import {PageableRequestFilter} from '../../../common/src/types/request'

type AppointmentBase = {
  firstName: string
  lastName: string
  email: string
  phone: number
  dateOfBirth: string
  registeredNursePractitioner: string
  dateOfAppointment: string
  appointmentId: number
  timeOfAppointment?: string
  barCode?: string
  packageCode: string
  certificate?: string
  organizationId?: string
  canceled?: boolean
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
  time: string
  forms: Array<AppointmentAcuityForm>
  certificate: string
  location: string
  organizationId: string
  datetime: string
}

export type AppointmentSearchRequest = {
  barCodeNumber?: string
  organizationId?: string
  firstName?: string
  lastName?: string
}

export type AppointmentSearchByDateRequest = {
  maxDate: string
  minDate: string
}

export type AppointmentRequest = AppointmentSearchRequest | AppointmentSearchByDateRequest

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
  Detected2019nCoV = '2019-nCoV Detected',
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

export type TestResultsDTO = TestResultsBase

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

export type CheckAppointmentRequest = {
  from: string
  to: string
  barCodes: string[]
}

export type TestResultsDTOForEmail = TestResultsBase & AppointmentBase

export type SendAndSaveTestResultsRequest = {
  results: TestResultsAgainRequest[]
  from: string
  to: string
  resultDate: Date
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

export type AppointmentByOrganizationRequest = PageableRequestFilter & {
  organizationId?: string
  searchQuery?: string
}

export type AcuityUpdateDTO = {
  barCodeNumber?: string
  organizationId?: string
}

export type AppointmentUI = AppointmentBase & {
  id?: number
  location?: string
  dateTime?: string
}

export type AppointmentUiDTO = {
  id: number
  firstName: string
  lastName: string
  location?: string
  status?: string
  barCode: string
  dateTime?: string
}

export const appointmentUiDTOResponse = (
  appointment: AppointmentDTO | AppointmentUI,
): AppointmentUiDTO => ({
  id: (appointment as AppointmentUI).id,
  firstName: appointment.firstName,
  lastName: appointment.lastName,
  status: (appointment as AppointmentUI).canceled ? 'Canceled' : 'Scheduled',
  barCode: appointment.barCode,
  location: (appointment as AppointmentUI).location,
  dateTime: (appointment as AppointmentUI).dateTime,
})
