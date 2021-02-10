import {firestore} from 'firebase-admin'
import {makeDeadline} from '../utils/datetime.helper'

import {PageableRequestFilter} from '../../../common/src/types/request'
import {formatDateRFC822Local} from '../utils/datetime.helper'
import moment from 'moment-timezone'

export enum AppointmentStatus {
  Pending = 'Pending',
  Submitted = 'Submitted',
  InTransit = 'InTransit',
  Received = 'Received',
  InProgress = 'InProgress',
  Reported = 'Reported',
  ReRunRequired = 'ReRunRequired',
  ReCollectRequired = 'ReCollectRequired',
  Canceled = 'Canceled',
}

export enum ResultTypes {
  PresumptivePositive = 'PresumptivePositive',
  Positive = 'Positive',
  Negative = 'Negative',
  Pending = 'Pending',
  Invalid = 'Invalid',
  Inconclusive = 'Inconclusive',
  Indeterminate = 'Indeterminate',
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
  location?: string
  organizationId?: string
  packageCode?: string
  phone: number
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
  barCode: string
  canceled: boolean
  canClientCancel: boolean
  certificate: string
  date: string
  dateOfBirth: string
  datetime: string
  email: string
  firstName: string
  forms: Array<AppointmentAcuityForm>
  id: number
  labels: LabelsAcuityResponse[]
  lastName: string
  location: string
  ohipCard?: string
  organizationId?: string
  phone: number
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
  couponCode: string
  shareTestResultWithEmployer: boolean
  readTermsAndConditions: boolean
  agreeToConductFHHealthAssessment: boolean
  receiveResultsViaEmail: boolean
  receiveNotificationsFromGov: boolean
  organizationId: string
  userId: string
}

export type AppointmentByOrganizationRequest = PageableRequestFilter & {
  organizationId?: string
  searchQuery?: string
  dateOfAppointment?: string
  transportRunId?: string
  barCode?: string
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
  appointment?: boolean
  canCancel?: boolean
  registeredNursePractitioner?: string
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
  SameDay = 'SameDay',
  NextDay = 'NextDay',
}

const filteredAppointmentStatus = (
  status: AppointmentStatus,
  isLabUser: boolean,
): AppointmentStatus => {
  if (
    !isLabUser &&
    (status === AppointmentStatus.InTransit || status === AppointmentStatus.Received)
  ) {
    return AppointmentStatus.Submitted
  }
  if (!isLabUser && status === AppointmentStatus.ReRunRequired) {
    return AppointmentStatus.InProgress
  }
  return status
}

export type Filter = {
  id: string
  name: string
  count: number
}

enum FilterGroupKey {
  organizationId = 'organizationId',
  appointmentStatus = 'appointmentStatus',
}

enum FilterName {
  FilterByStatusType = 'Filter By Status Type',
  FilterByCorporation = 'Filter By Corporation',
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

export const appointmentStatsUiDTOResponse = (
  appointmentStatus: Filter[],
  orgIdArray: Filter[],
  total: number,
): appointmentStatsUiDTO => ({
  total,
  filterGroup: [
    {
      name: FilterName.FilterByStatusType,
      key: FilterGroupKey.appointmentStatus,
      filters: appointmentStatus,
    },
    {
      name: FilterName.FilterByCorporation,
      key: FilterGroupKey.organizationId,
      filters: orgIdArray,
    },
  ],
})

export const appointmentUiDTOResponse = (
  appointment: AppointmentDBModel & {canCancel?: boolean},
  isLabUser: boolean,
): AppointmentUiDTO => {
  return {
    id: appointment.id,
    firstName: appointment.firstName,
    lastName: appointment.lastName,
    status: filteredAppointmentStatus(appointment.appointmentStatus, isLabUser),
    barCode: appointment.barCode,
    location: appointment.location,
    dateTime: formatDateRFC822Local(appointment.dateTime),
    dateOfBirth: appointment.dateOfBirth,
    transportRunId: appointment.transportRunId,
    deadline: formatDateRFC822Local(appointment.deadline),
    latestResult: appointment.latestResult,
    vialLocation: appointment.vialLocation,
    canCancel: appointment.canCancel,
  }
}

export type UserAppointment = {
  id: string
  QRCode: string
  dateOfBirth: string
  showQrCode: boolean
  dateOfAppointment: string
  firstName: string
  lastName: string
  locationName: string
  locationAddress: string
  timeOfAppointment: string
}

export const userAppointmentDTOResponse = (appointment: AppointmentDBModel): UserAppointment => ({
  id: appointment.id,
  QRCode: appointment.barCode,
  dateOfBirth: appointment.dateOfBirth,
  showQrCode: moment(makeDeadline(moment())).isBefore(appointment.deadline.toDate()),
  firstName: appointment.firstName,
  lastName: appointment.lastName,
  locationName: appointment.location,
  locationAddress: appointment.address,
  dateOfAppointment: appointment.dateOfAppointment,
  timeOfAppointment: appointment.timeOfAppointment,
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
    location: appointment.location,
    dateTime: formatDateRFC822Local(appointment.dateTime),
    dateOfBirth: appointment.dateOfBirth,
    deadline: formatDateRFC822Local(appointment.deadline),
    registeredNursePractitioner: appointment.registeredNursePractitioner,
    organizationName: organizationName,
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
