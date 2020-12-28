import {PageableRequestFilter} from '../../../common/src/types/request'

export type AppointmentBase = {
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

export enum AppointmentStatus {
  pending = 'pending',
  inTransit = 'inTransit',
  received = 'received',
  inProgress = 'inProgress',
  reported = 'reported',
}

export enum Result {
  pending = 'pending',
  positive = 'positive',
  negative = 'negative',
  covidDetected = '2019-nCoVDetected',
  invalid = 'invalid',
  inconclusive = 'inconclusive',
}

export type AppointmentDbBase = {
  firstName: string
  lastName: string
  email: string
  phone: number
  dateOfBirth: string
  dateOfAppointment: string
  acuityAppointmentId: number
  timeOfAppointment?: string
  barCode: string
  packageCode?: string
  organizationId?: string
  appointmentStatus: AppointmentStatus
  result: Result
  location?: string
  receivedAt?: Date
}

export type AppointmentsDBModel = AppointmentDbBase & {
  id: string
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
  labels: LabelsAcuityResponse[]
}

export type LabelsAcuityResponse = {
  id: number
  name: Label
  color: string
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

export type CheckAppointmentRequest = {
  from: string
  to: string
  barCodes: string[]
}

export type AppointmentByOrganizationRequest = PageableRequestFilter & {
  organizationId?: string
  searchQuery?: string
  dateOfAppointment?: string
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
  dateOfBirth?: string
}

export type AppointmentFilters = {
  organizationId?: string
  showall: boolean
  minDate?: string
  maxDate?: string
}

export type AppointmentsState = {
  appointmentId: string
  state: AppointmentAttachTransportStatus
}

export enum AppointmentAttachTransportStatus {
  Succeed = 'succeed',
  Failed = 'failed',
}

export enum Label {
  SameDay = 'SameDay',
  NextDay = 'NextDay',
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
  dateOfBirth: appointment.dateOfBirth,
})
