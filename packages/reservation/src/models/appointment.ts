import {firestore} from 'firebase-admin'
import {isSameOrBefore} from '../utils/datetime.helper'

import {PageableRequestFilter} from '../../../common/src/types/request'
import {formatDateRFC822Local} from '../utils/datetime.helper'
import {AppointmentPushTypes} from '../types/appointment-push'

export enum AppointmentStatus {
  Pending = 'Pending',
  Submitted = 'Submitted',
  InTransit = 'InTransit',
  Received = 'Received',
  CheckedIn = 'CheckedIn',
  InProgress = 'InProgress',
  Reported = 'Reported',
  ReRunRequired = 'ReRunRequired',
  ReCollectRequired = 'ReCollectRequired',
  Canceled = 'Canceled',
}

export enum ResultTypes {
  PresumptivePositive = 'PresumptivePositive',
  PreliminaryPositive = 'PreliminaryPositive',
  Positive = 'Positive',
  Negative = 'Negative',
  Pending = 'Pending',
  Invalid = 'Invalid',
  Inconclusive = 'Inconclusive',
  Indeterminate = 'Indeterminate',
}

export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other',
  PreferNotToSay = 'Prefer Not to Say',
}

export type AppointmentDBModel = {
  id: string
  acuityAppointmentId: number
  appointmentStatus: AppointmentStatus
  agreeToConductFHHealthAssessment: boolean
  barCode: string
  canceled: boolean
  dateOfAppointment: string
  dateOfBirth: string
  dateTime: firestore.Timestamp
  deadline: firestore.Timestamp
  email: string
  firstName: string
  lastName: string
  gender?: Gender
  organizationId?: string
  packageCode?: string
  phone: number
  postalCode?: string
  registeredNursePractitioner?: string
  latestResult: ResultTypes
  timeOfAppointment: string
  transportRunId?: string
  appointmentTypeID: number
  calendarID: number
  vialLocation?: string
  address: string
  addressUnit: string
  couponCode?: string
  travelID?: string
  travelIDIssuingCountry?: string
  ohipCard?: string
  swabMethod?: string
  shareTestResultWithEmployer: boolean
  readTermsAndConditions: boolean
  receiveResultsViaEmail: boolean
  receiveNotificationsFromGov: boolean
  userId?: string
  locationName?: string
  locationAddress?: string
  testType: TestTypes
  labId?: string
  scheduledPushesToSend?: AppointmentPushTypes[]
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
  address: string
  addressUnit: string
  agreeToConductFHHealthAssessment: boolean
  appointmentTypeID: number
  barCode: string
  calendar: string
  calendarID: number
  canceled: boolean
  canClientCancel: boolean
  canClientReschedule: boolean
  certificate: string
  date: string
  dateOfBirth: string
  datetime: string
  email: string
  firstName: string
  forms: Array<AppointmentAcuityForm>
  gender: Gender
  id: number
  labels: LabelsAcuityResponse[]
  lastName: string
  ohipCard?: string
  location: string
  organizationId?: string
  phone: number
  postalCode: string
  readTermsAndConditions: boolean
  receiveNotificationsFromGov: boolean
  receiveResultsViaEmail: boolean
  registeredNursePractitioner?: string
  shareTestResultWithEmployer: boolean
  swabMethod?: string
  time: string
  travelID?: string
  travelIDIssuingCountry?: string
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

export enum TestTypes {
  PCR = 'PCR',
  RapidAntigen = 'RapidAntigen',
  TemperatureCheck = 'Temperature',
  Attestation = 'Attestation',
  EmergencyRapidAntigen = 'EmergencyRapidAntigen',
  Antibody_All = 'Antibody_All',
  Antibody_IgM = 'Antibody_IgM',
  PulseOxygenCheck = 'PulseOxygenCheck',
}

export type PostAdminScanHistoryRequest = {
  type: TestTypes
  barCode: string
  organizationId: string
}

export type GetAdminScanHistoryRequest = {
  type: TestTypes
}

export type CreateAppointmentRequest = {
  slotId: string
  firstName: string
  lastName: string
  gender: Gender
  phone: {
    code: number
    number: number
  }
  dateOfBirth: string
  address: string
  addressUnit: string
  postalCode: string
  couponCode: string
  shareTestResultWithEmployer: boolean
  readTermsAndConditions: boolean
  agreeToConductFHHealthAssessment: boolean
  receiveResultsViaEmail: boolean
  receiveNotificationsFromGov: boolean
  organizationId: string
  userId: string
  packageCode: string
}

export type AppointmentByOrganizationRequest = PageableRequestFilter & {
  organizationId?: string
  searchQuery?: string
  dateOfAppointment?: string
  transportRunId?: string
  barCode?: string
  appointmentStatus?: AppointmentStatus[]
  labId?: string
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
  email: string
  phone: number
  deadline?: string
  latestResult?: string
  vialLocation?: string
  appointment?: boolean
  canCancel?: boolean
  registeredNursePractitioner?: string
  organizationName?: string
  labName?: string
  transportRunLabel?: string
  testType: string
}

export type AppointmentsState = {
  appointmentId: string
  state: AppointmentStatusChangeState
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
  actionBy: string
}

export type AppointmentStatusHistoryDb = AppointmentStatusHistory & {
  id: string
}

export enum AppointmentStatusChangeState {
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
  SameDay = 'SAMEDAY',
  NextDay = 'NEXTDAY',
}

export const filteredAppointmentStatus = (
  status: AppointmentStatus,
  isLabUser: boolean,
  isClinicUser: boolean,
): AppointmentStatus => {
  const isNotLabOrClinicUser = !(isLabUser || isClinicUser)

  if (
    isNotLabOrClinicUser &&
    (status === AppointmentStatus.InTransit || status === AppointmentStatus.Received)
  ) {
    return AppointmentStatus.Submitted
  }

  if (isNotLabOrClinicUser && status === AppointmentStatus.ReRunRequired) {
    return AppointmentStatus.InProgress
  }

  return status
}

export type Filter = {
  id: string
  name: string
  count: number
}

export enum FilterGroupKey {
  organizationId = 'organizationId',
  labId = 'labId',
  appointmentStatus = 'appointmentStatus',
  result = 'result',
}

export enum FilterName {
  FilterByStatusType = 'Filter By Status Type',
  FilterByResult = 'Filter By Result',
  FilterByCorporation = 'Filter By Corporation',
  FilterByLab = 'Filter By Lab',
}

type FilterGroup = {
  name: string
  key: FilterGroupKey
  filters: Filter[]
}

export type appointmentStatsUiDTO = {
  total: number
  filterGroup: FilterGroup[]
}

export const statsUiDTOResponse = (
  filterGroup: FilterGroup[],
  total: number,
): appointmentStatsUiDTO => ({
  total,
  filterGroup,
})

export const appointmentUiDTOResponse = (
  appointment: AppointmentDBModel & {
    canCancel?: boolean
    organizationName?: string
    labName?: string
  },
  isLabUser: boolean,
  isClinicUser: boolean,
  transportRunLabel?: string,
): AppointmentUiDTO => {
  return {
    id: appointment.id,
    firstName: appointment.firstName,
    lastName: appointment.lastName,
    status: filteredAppointmentStatus(appointment.appointmentStatus, isLabUser, isClinicUser),
    barCode: appointment.barCode,
    location: appointment.locationAddress,
    email: appointment.email,
    phone: appointment.phone,
    dateTime: formatDateRFC822Local(appointment.dateTime),
    dateOfBirth: appointment.dateOfBirth,
    transportRunId: appointment.transportRunId,
    deadline: formatDateRFC822Local(appointment.deadline),
    latestResult: appointment.latestResult,
    vialLocation: appointment.vialLocation,
    canCancel: appointment.canCancel,
    organizationName: appointment.organizationName,
    labName: appointment?.labName,
    testType: appointment.testType ?? 'PCR',
    transportRunLabel,
  }
}

export type UserAppointment = {
  id: string
  QRCode: string
  showQrCode: boolean
  firstName: string
  lastName: string
  locationName: string
  locationAddress: string
  dateTime: string
}

export const userAppointmentDTOResponse = (appointment: AppointmentDBModel): UserAppointment => ({
  id: appointment.id,
  QRCode: appointment.barCode,
  showQrCode:
    isSameOrBefore(appointment.dateOfAppointment) &&
    appointment.appointmentStatus !== AppointmentStatus.Canceled,
  firstName: appointment.firstName,
  lastName: appointment.lastName,
  locationName: appointment.locationName,
  locationAddress: appointment.locationAddress,
  dateTime: formatDateRFC822Local(appointment.dateTime),
})

export const appointmentByBarcodeUiDTOResponse = (
  appointment: AppointmentDBModel,
  organizationName?: string,
): AppointmentUiDTO & {organizationName?: string} => {
  return {
    id: appointment.id,
    firstName: appointment.firstName,
    lastName: appointment.lastName,
    status: appointment.appointmentStatus,
    barCode: appointment.barCode,
    location: appointment.locationAddress,
    email: appointment.email,
    phone: appointment.phone,
    dateTime: formatDateRFC822Local(appointment.dateTime),
    dateOfBirth: appointment.dateOfBirth,
    deadline: formatDateRFC822Local(appointment.deadline),
    registeredNursePractitioner: appointment.registeredNursePractitioner,
    organizationName: organizationName,
    testType: appointment.testType ?? 'PCR',
  }
}

export type ActivityTracking = {
  action: AppointmentActivityAction
  currentData: Partial<AppointmentDBModel>
  newData: Partial<AppointmentDBModel>
  actionBy?: string // not required for action updateFromAcuity
}

export enum AppointmentActivityAction {
  RegenerateBarcode = 'regenerateBarcode',
  UpdateFromAcuity = 'updateFromAcuity',
}

export type UpdateAppointmentActionParams = {
  id: string
  updates: Partial<AppointmentDBModel>
  action?: AppointmentActivityAction
  actionBy?: string
}

export type ActivityTrackingDb = ActivityTracking & {
  id: string
}

export type RescheduleAppointmentDTO = {
  appointmentId: string
  dateTime: string
  organizationId?: string
  userID: string
  isLabUser: boolean
}

export type UpdateTransPortRun = {
  transportRunId: string
  userId: string
  labId?: string
}
