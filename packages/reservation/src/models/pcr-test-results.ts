import {ResultTypes} from './appointment'

export enum PCRResultActions {
  NoOverwrite = 'NoOverwrite',
  DoNothing = 'DoNothing',
  ReRunToday = 'ReRunToday',
  ReRunTomorrow = 'ReRunTomorrow',
  RequestReSample = 'RequestReSample',
  MarkAsPositive = 'MarkAsPositive',
  MarkAsNegative = 'MarkAsNegative',
}

export enum ResultReportStatus {
  RequestReceived = 'RequestReceived',
  Processing = 'Processing',
  Failed = 'Failed',
  SuccessfullyReported = 'SuccessfullyReported',
}

type PCRResultSpecs = {
  action: PCRResultActions
  autoResult: ResultTypes
  calRed61Ct: string
  calRed61RdRpGene: string
  famCt: string
  famEGene: string
  hexCt: string
  hexIC: string
  notify: boolean
  quasar670Ct: string
  quasar670NGene: string
  resultDate: Date
}

export type PCRTestResultRequestData = PCRResultSpecs & {
  barCode: string
}

export type PCRTestResultRequest = {
  reportTrackerId?: string
  results: PCRTestResultRequestData[]
  resultDate: Date
}

export type PCRTestResultData = {
  barCode: string
  resultSpecs?: PCRResultSpecs
}

type AppointmentDataForPCRResult = {
  firstName: string
  lastName: string
  appointmentId: string
  organizationId: string
  dateOfAppointment: string
}

export type PCRTestResultDBModel = PCRTestResultData &
  AppointmentDataForPCRResult & {
    id: string
    result: ResultTypes
    waitingResult: boolean
    displayForNonAdmins: boolean
  }

export type PCRTestResultEmailDTO = Omit<PCRTestResultDBModel, 'id'> & {
  email: string
  phone: number
  dateOfBirth: string
  registeredNursePractitioner?: string
  timeOfAppointment: string
  dateTime: string
}

export type ProcessPCRResultRequest = {
  reportTrackerId: string
  resultId: string
}

export type TestResultsReportingTrackerDBModel = {
  id: string
}

export type TestResultsReportingTrackerPCRResultsDBModel = {
  id: string
  status: ResultReportStatus
  data: PCRTestResultRequestData
  details?: string
}

export type CreateReportForPCRResultsResponse = {
  reportTrackerId: string
}
