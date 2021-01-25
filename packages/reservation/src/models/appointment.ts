import {PageableRequestFilter} from '../../../common/src/types/request'
import moment from 'moment-timezone'
import {Config} from '../../../common/src/utils/config'

export enum AppointmentStatus {
  Pending = 'Pending',
  InTransit = 'InTransit',
  Received = 'Received',
  InProgress = 'InProgress',
  Reported = 'Reported',
  ReRunRequired = 'ReRunRequired',
  ReSampleRequired = 'ReSampleRequired',
  Canceled = 'Canceled',
}

export enum AppointmentReasons {
  AlreadyReported = 'Already Reported',
  ReSampleAlreadyRequested = 'ReSample Already Requested',
  InProgress = 'In Progress',
  NoInProgress = 'No In Progress',
}

export enum ResultTypes {
  Positive = 'Positive',
  Negative = 'Negative',
  Pending = 'Pending',
  Invalid = 'Invalid',
  Inconclusive = 'Inconclusive',
  ReSampleRequested = 'ReSampleRequested',
}

export type AppointmentModelBase = {
  acuityAppointmentId: number
  appointmentStatus: AppointmentStatus
  barCode: string
  canceled: boolean
  dateOfAppointment: string
  dateOfBirth: string
  dateTime: string
  deadline: string
  email: string
  firstName: string
  inProgressAt?: Date
  lastName: string
  location?: string
  organizationId?: string
  packageCode?: string
  phone: number
  receivedAt?: Date
  registeredNursePractitioner?: string
  latestResult: ResultTypes
  timeOfAppointment: string
  transportRunId?: string
  appointmentTypeID: number
  calendarID: number
  vialLocation?: string
  address: string
  addressUnit: string
  addressForTesting: string
  additionalAddressNotes: string
  couponCode: string
  shareTestResultWithEmployer: boolean
  readTermsAndConditions: boolean
  receiveResultsViaEmail: boolean
  receiveNotificationsFromGov: boolean
}

export type AppointmentDBModel = AppointmentModelBase & {
  id: string
}

//Legacy: Should be removed once Appointment Check is move dto Dashboard
export type AppoinmentDataUI = {
  findAppoinmentTab: string
  invalidBarCodeNumber?: boolean
  barCode: string
  appointment?: AppointmentDBModel
}

type AppointmentAcuityFormField = {
  fieldID: number
  value: string
}

type AppointmentAcuityForm = {
  values: Array<AppointmentAcuityFormField>
}

//Response From Acuity
export type AppointmentAcuityResponse = {
  id: number
  date: string
  time: string
  forms: Array<AppointmentAcuityForm>
  certificate: string
  location: string
  organizationId: string
  datetime: string
  labels: LabelsAcuityResponse[]
  firstName: string
  lastName: string
  email: string
  phone: number
  dateOfBirth: string
  registeredNursePractitioner: string
  barCode: string
  canceled: boolean
  canClientCancel: boolean
  address: string
  addressUnit: string
  addressForTesting: string
  additionalAddressNotes: string
  shareTestResultWithEmployer: boolean
  readTermsAndConditions: boolean
  receiveResultsViaEmail: boolean
  receiveNotificationsFromGov: boolean
}

export type LabelsAcuityResponse = {
  id: number
  name: DeadlineLabel
  color: string
}

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

export type CreateAppointmentRequest = {
  slotId: string
  firstName: string
  lastName: string
  email: string
  phone: {
    code: number
    number: number
  }
  dateOfBirth: string
  address: string
  addressUnit: string
  addressForTesting: string
  additionalAddressNotes: string
  couponCode: string
  shareTestResultWithEmployer: boolean
  readTermsAndConditions: boolean
  agreeToConductFHHealthAccessment: boolean
  receiveResultsViaEmail: boolean
  receiveNotificationsFromGov: boolean
  vialLocation: string
  appointmentIds: string[]
}

export type AppointmentByOrganizationRequest = PageableRequestFilter & {
  organizationId?: string
  searchQuery?: string
  dateOfAppointment?: string
  transportRunId?: string
  testRunId?: string
  deadlineDate?: string
  appointmentStatus?: AppointmentStatus[]
}

//Update to Acuity Service
export type AcuityUpdateDTO = {
  barCodeNumber?: string
  organizationId?: string
}

//DTO for API Responses
export type AppointmentUiDTO = {
  id: string
  firstName: string
  lastName: string
  status: string
  barCode: string
  dateTime: string
  dateOfBirth: string
  location?: string
  transportRunId?: string
  deadline?: string
  latestResult?: string
  vialLocation?: string
  testRunId?: string
  appointment?: boolean
  canCancel?: boolean
}

export type AppointmentsState = {
  appointmentId: string
  state: AppointmentAttachTransportStatus
}

export type AppointmentStatusHistory = {
  newStatus: AppointmentStatus
  previousStatus: AppointmentStatus
  createdOn: Date
  createdBy: string
}

export type AppointmentChangeToRerunRequest = {
  appointment: AppointmentDBModel
  deadlineLabel: DeadlineLabel
  userId: string
}

export type AppointmentStatusHistoryDb = AppointmentStatusHistory & {
  id: string
}

export enum AppointmentAttachTransportStatus {
  Succeed = 'succeed',
  Failed = 'failed',
}

export enum AcuityWebhookActions {
  Scheduled = 'scheduled',
  Rescheduled = 'rescheduled',
  Canceled = 'canceled',
  Changed = 'changed',
  OrderCompleted = 'order.completed',
}

export enum WebhookEndpoints {
  Create = 'Create',
  Update = 'Update',
}

export enum DeadlineLabel {
  SameDay = 'SameDay',
  NextDay = 'NextDay',
}

export type AvailableSlotResponse = {
  id: string
  label: string
}

export const appointmentUiDTOResponse = (
  appointment: AppointmentDBModel & {canCancel?: boolean},
): AppointmentUiDTO => {
  const timeZone = Config.get('DEFAULT_TIME_ZONE')
  return {
    id: appointment.id,
    firstName: appointment.firstName,
    lastName: appointment.lastName,
    status: appointment.appointmentStatus,
    barCode: appointment.barCode,
    location: appointment.location,
    dateTime: moment(appointment.dateTime).tz(timeZone).format(),
    dateOfBirth: appointment.dateOfBirth,
    transportRunId: appointment.transportRunId,
    deadline: moment(appointment.deadline).tz(timeZone).format(),
    latestResult: appointment.latestResult,
    vialLocation: appointment.vialLocation,
    canCancel: appointment.canCancel,
  }
}
