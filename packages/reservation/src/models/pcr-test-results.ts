import {firestore} from 'firebase-admin'

import {AppointmentReasons, AppointmentStatus, ResultTypes} from './appointment'

export enum PCRResultActions {
  SendThisResult = 'SendThisResult',
  DoNothing = 'DoNothing',
  ReRunToday = 'ReRunToday',
  ReRunTomorrow = 'ReRunTomorrow',
  RequestReSample = 'RequestReSample',
  MarkAsPositive = 'MarkAsPositive',
  MarkAsNegative = 'MarkAsNegative',
  MarkAsPresumptivePositive = 'MarkAsPresumptivePositive',
}

export enum PCRResultActionsAllowedResend {
  SendThisResult = 'SendThisResult',
  MarkAsPositive = 'MarkAsPositive',
  MarkAsNegative = 'MarkAsNegative',
}

export enum ResultReportStatus {
  Failed = 'Failed',
  Processing = 'Processing',
  RequestReceived = 'RequestReceived',
  SentReRunRequest = 'SentReRunRequest',
  SentReSampleRequest = 'SentReSampleRequest',
  SentResult = 'SentResult',
  Skipped = 'Skipped',
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
  sendUpdatedResults?: boolean
}

export type PCRListQueryRequest = {
  barcode: string[]
}

export type PCRTestResultRequest = {
  reportTrackerId?: string
  results: PCRTestResultRequestData[]
  resultDate: Date
}

export type PCRTestResultData = {
  barCode: string
  adminId: string
  resultSpecs?: PCRResultSpecs
}

type AppointmentDataForPCRResult = {
  firstName: string
  lastName: string
  appointmentId: string
  organizationId?: string
  dateOfAppointment: string
}

export type PCRTestResultDBModel = PCRTestResultData &
  AppointmentDataForPCRResult & {
    id: string
    linkedBarCodes: string[]
    result: ResultTypes
    waitingResult: boolean
    displayForNonAdmins: boolean
    deadline: firestore.Timestamp
    testRunId?: string
    runNumber: number
    reSampleNumber: number
    updatedAt: firestore.Timestamp
  }

export type PCRTestResultLinkedDBModel = PCRTestResultDBModel & {
  linkedResults?: PCRTestResultDBModel[]
}

export type PCRTestResultHistoryDTO = {
  id: string
  barCode: string
  waitingResult: boolean
  results: PCRResults[]
  reason: AppointmentReasons
  reSampleNumber: number | string
  runNumber: number | string
  dateOfAppointment: string
}

export type PCRResults = {
  famEGene: string
  famCt: string
  calRed61RdRpGene: string
  calRed61Ct: string
  quasar670NGene: string
  quasar670Ct: string
  hexIC: string
  hexCt: string
  result: string
  reSampleNumber: string
  runNumber: string
  dateOfAppointment: string
  barCode: string
}

export type PCRTestResultEmailDTO = Omit<
  PCRTestResultDBModel,
  'id' | 'linkedBarCodes' | 'deadline' | 'runNumber' | 'reSampleNumber' | 'updatedAt'
> & {
  email: string
  phone: number
  dateOfBirth: string
  registeredNursePractitioner?: string
  timeOfAppointment: string
  dateTime: firestore.Timestamp
  travelID?: string
  travelIDIssuingCountry?: string
  swabMethod?: string
}

export type ProcessPCRResultRequest = {
  reportTrackerId: string
  resultId: string
}

export type ListPCRResultRequest = {
  reportTrackerId: string
}

export type TestResultsReportingTrackerDBModel = {
  id: string
}

export type TestResultsReportingTrackerPCRResultsDBModel = {
  id: string
  adminId: string
  status: ResultReportStatus
  data: PCRTestResultRequestData
  details?: string
}

export type CreateReportForPCRResultsResponse = {
  reportTrackerId: string
}

export const PCRTestResultHistoryResponse = (
  pcrTests: PCRTestResultHistoryDTO,
): PCRTestResultHistoryDTO => ({
  id: pcrTests.id,
  barCode: pcrTests.barCode,
  waitingResult: pcrTests.waitingResult,
  results: pcrTests.results.map((result) => ({
    famEGene: result.famEGene,
    famCt: result.famCt,
    calRed61RdRpGene: result.calRed61RdRpGene,
    calRed61Ct: result.calRed61Ct,
    quasar670NGene: result.quasar670NGene,
    quasar670Ct: result.quasar670Ct,
    hexIC: result.hexIC,
    hexCt: result.hexCt,
    result: result.result,
    barCode: result.barCode,
    reSampleNumber: result.reSampleNumber ? `S${result.reSampleNumber}` : '',
    runNumber: result.runNumber ? `R${result.runNumber}` : '',
    dateOfAppointment: result.dateOfAppointment,
  })),
  reSampleNumber: pcrTests.reSampleNumber ? `S${pcrTests.reSampleNumber}` : '',
  runNumber: pcrTests.runNumber ? `R${pcrTests.runNumber}` : '',
  reason: pcrTests.reason,
  dateOfAppointment: pcrTests.dateOfAppointment,
})

export type PcrTestResultsListByDeadlineRequest = {
  deadline?: string
  testRunId?: string
}

export type PcrTestResultsListRequest = {
  organizationId?: string
  deadline?: string
  barCode?: string
}

export type PCRTestResultListDTO = {
  id: string
  firstName: string
  lastName: string
  testType: string
  dateOfAppointment?: string
  barCode: string
  result: ResultTypes
  vialLocation?: string
  status?: AppointmentStatus
  dateTime?: string
  deadline?: string
  testRunId?: string
}

export type PCRTestResultByDeadlineListDTO = {
  id: string
  barCode: string
  vialLocation: string
  status: AppointmentStatus
  deadline: string
  testRunId: string
  runNumber: string
  reSampleNumber: string
  dateTime: string
}

export const pcrResultsResponse = (pcrResult: PCRTestResultDBModel): PCRTestResultListDTO => ({
  id: pcrResult.id,
  firstName: pcrResult.firstName,
  lastName: pcrResult.lastName,
  testType: 'PCR',
  dateOfAppointment: pcrResult.dateOfAppointment,
  barCode: pcrResult.barCode,
  result: pcrResult.result,
})

export type pcrTestResultsDTO = {
  barCode: string
  status: ResultReportStatus
  details?: string
}

export const pcrTestResultsResponse = (
  pcrTestResult: TestResultsReportingTrackerPCRResultsDBModel,
): pcrTestResultsDTO => ({
  barCode: pcrTestResult.data.barCode,
  status: pcrTestResult.status,
  details: pcrTestResult.details,
})
