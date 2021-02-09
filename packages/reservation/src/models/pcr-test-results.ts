import {firestore} from 'firebase-admin'

import {formatDateRFC822Local} from '../utils/datetime.helper'

import {AppointmentDBModel, AppointmentStatus, ResultTypes} from './appointment'

export enum AppointmentReasons {
  AlreadyReported = 'Already Reported',
  ReCollectAlreadyRequested = 'ReCollect Already Requested',
  InProgress = 'In Progress',
  NoInProgress = 'No In Progress',
  NotFound = 'Test not found',
  NotWaitingButInProgress = 'Something went Wrong',
}

export enum EmailNotficationTypes {
  Indeterminate = 'Indeterminate',
  MarkAsConfirmedPositive = 'MarkAsConfirmedPositive',
  MarkAsConfirmedNegative = 'MarkAsConfirmedNegative',
}

export enum PCRResultPDFType {
  ConfirmedPositive = 'ConfirmedPositive',
  ConfirmedNegative = 'ConfirmedNegative',
  Negative = 'Negative',
  Positive = 'Positive',
  PresumptivePositive = 'PresumptivePositive',
}

//Actions when Results are sent from Single OR Bulk
export enum PCRResultActions {
  SendThisResult = 'SendThisResult',
  DoNothing = 'DoNothing',
  ReRunToday = 'ReRunToday',
  ReRunTomorrow = 'ReRunTomorrow',
  RequestReCollect = 'RequestReCollect',
  MarkAsPositive = 'MarkAsPositive',
  MarkAsNegative = 'MarkAsNegative',
  MarkAsPresumptivePositive = 'MarkAsPresumptivePositive',
}

//Actions when Results are Confirmed
export enum PCRResultActionsForConfirmation {
  Indeterminate = 'Indeterminate',
  MarkAsPositive = 'MarkAsPositive',
  MarkAsNegative = 'MarkAsNegative',
}

export enum PCRResultActionsAllowedResend {
  SendThisResult = 'SendThisResult',
  MarkAsPositive = 'MarkAsPositive',
  MarkAsNegative = 'MarkAsNegative',
}

//Possible report Status when Results are sent
export enum ResultReportStatus {
  Failed = 'Failed',
  Processing = 'Processing',
  RequestReceived = 'RequestReceived',
  SentReRunRequest = 'SentReRunRequest',
  SentReCollectRequest = 'SentReCollectRequest',
  SentResult = 'SentResult',
  Skipped = 'Skipped',
}

export type PCRTestResultConfirmRequest = {
  barCode: string
  action: PCRResultActionsForConfirmation
}

export enum PCRTestResultStyle {
  Postive = 'RED',
  Negative = 'GREEN',
  Invalid = 'YELLOW',
  Inconclusive = 'BLUE',
  AnyOther = 'GREY',
}

export enum PCRTestResultType {
  PCR = 'PCR',
}

type PCRResultSpecs = {
  calRed61Ct: string
  calRed61RdRpGene: string
  famCt: string
  famEGene: string
  hexCt: string
  hexIC: string
  quasar670Ct: string
  quasar670NGene: string
}

type PCRResultSpecsForSending = PCRResultSpecs & {
  action: PCRResultActions
  autoResult: ResultTypes
  notify: boolean
  resultDate: Date
}

type PCRResultsForHistory = PCRResultSpecs & {
  barCode: string
  dateTime: firestore.Timestamp | string
  reCollectNumber: string
  result: string
  runNumber: string
}

export type PCRTestResultRequestData = PCRResultSpecsForSending & {
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
  resultSpecs?: PCRResultSpecsForSending
}

export type PCRTestResultDBModel = PCRTestResultData & {
  appointmentId: string
  confirmed: boolean
  dateTime: firestore.Timestamp
  deadline: firestore.Timestamp
  displayForNonAdmins: boolean
  firstName: string
  id: string
  lastName: string
  linkedBarCodes: string[]
  organizationId?: string
  recollected: boolean
  reCollectNumber: number
  result: ResultTypes
  runNumber: number
  testRunId?: string
  updatedAt: firestore.Timestamp
  waitingResult: boolean
}

export type PCRTestResultLinkedDBModel = PCRTestResultDBModel & {
  linkedResults?: PCRTestResultDBModel[]
}
export type PCRTestResultHistory = {
  id: string
  barCode: string
  waitingResult: boolean
  results: PCRTestResultLinkedDBModel[]
  reason?: AppointmentReasons
  reCollectNumber: number
  runNumber: number
  dateTime: firestore.Timestamp
}

export type PCRTestResultHistoryResponseDTO = {
  id: string
  barCode: string
  waitingResult: boolean
  results: PCRResultsForHistory[]
  reason?: AppointmentReasons
  reCollectNumber: string
  runNumber: string
  dateTime: string
}

export type PCRTestResultEmailDTO = Omit<
  PCRTestResultDBModel,
  'id' | 'linkedBarCodes' | 'deadline' | 'runNumber' | 'reCollectNumber' | 'updatedAt'
> &
  AppointmentDBModel

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
  pcrTests: PCRTestResultHistory,
): PCRTestResultHistoryResponseDTO => ({
  id: pcrTests.id,
  barCode: pcrTests.barCode,
  waitingResult: pcrTests.waitingResult,
  results: pcrTests.results.map((result) => ({
    famEGene: result.resultSpecs.famEGene,
    famCt: result.resultSpecs.famCt,
    calRed61RdRpGene: result.resultSpecs.calRed61RdRpGene,
    calRed61Ct: result.resultSpecs.calRed61Ct,
    quasar670NGene: result.resultSpecs.quasar670NGene,
    quasar670Ct: result.resultSpecs.quasar670Ct,
    hexIC: result.resultSpecs.hexIC,
    hexCt: result.resultSpecs.hexCt,
    result: result.result,
    barCode: result.barCode,
    reCollectNumber: result.reCollectNumber ? `S${result.reCollectNumber}` : '',
    runNumber: result.runNumber ? `R${result.runNumber}` : '',
    dateTime: formatDateRFC822Local(result.dateTime as firestore.Timestamp),
  })),
  reCollectNumber: pcrTests.reCollectNumber ? `S${pcrTests.reCollectNumber}` : '',
  runNumber: pcrTests.runNumber ? `R${pcrTests.runNumber}` : '',
  reason: pcrTests.reason,
  dateTime: formatDateRFC822Local(pcrTests.dateTime as firestore.Timestamp),
})

export type PcrTestResultsListByDeadlineRequest = {
  deadline?: string
  testRunId?: string
  barCode?: string
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
  reCollectNumber: string
  dateTime: string
}

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

export const resultToStyle = (result: ResultTypes): PCRTestResultStyle => {
  return PCRTestResultStyle[result] ? PCRTestResultStyle[result] : PCRTestResultStyle.AnyOther
}

export type TestResutsDTO = {
  id: string
  type: PCRTestResultType
  name: string
  testDateTime: string
  style: PCRTestResultStyle
  result: ResultTypes
  detailsAvailable: boolean
}
