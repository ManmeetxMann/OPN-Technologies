import {firestore} from 'firebase-admin'

import {formatDateRFC822Local, formatStringDateRFC822Local} from '../utils/datetime.helper'

import {AppointmentDBModel, AppointmentStatus, ResultTypes, TestTypes} from './appointment'
import {Config} from '../../../common/src/utils/config'
import {groupByChannel} from '../utils/analysis.helper'
import {TestResultsMetaData} from './test-results'
import {PassportStatus, PassportStatuses} from '../../../passport/src/models/passport'
import {TemperatureStatusesUI} from './temperature'

const requisitionDoctor = Config.get('TEST_RESULT_REQ_DOCTOR')

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
  RecollectAsInvalid = 'RecollectAsInvalid',
  RecollectAsInconclusive = 'RecollectAsInconclusive',
  MarkAsPositive = 'MarkAsPositive',
  MarkAsNegative = 'MarkAsNegative',
  MarkAsPresumptivePositive = 'MarkAsPresumptivePositive',
  SendPreliminaryPositive = 'SendPreliminaryPositive',
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
  SentReRunRequest = 'Sent "Re-Run Request"',
  SentReCollectRequestAsInvalid = 'Sent "Re-Collect Request As Invalid"',
  SentReCollectRequestAsInconclusive = 'Sent "Re-Collect Request As Inconclusive"',
  SentPreliminaryPositive = 'Sent "Preliminary Positive"',
  SentPresumptivePositive = 'Sent "Presumptive Positive"',
  Skipped = 'Skipped',
}

export type PCRTestResultConfirmRequest = {
  barCode: string
  action: PCRResultActionsForConfirmation
}

export enum TestResultStyle {
  // PCR result style
  Positive = 'RED',
  Negative = 'GREEN',
  Invalid = 'YELLOW',
  ReCollectRequired = 'YELLOW',
  Inconclusive = 'BLUE',
  AnyOther = 'GRAY',
  // Temperature check style
  Failed = 'RED',
  Passed = 'GREEN',
  // Atestation result style
  caution = 'YELLOW',
  stop = 'RED',
  proceed = 'GREEN',
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
  comment?: string
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
  // WORKLING ONTHIS
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
  resultSpecs?: PCRResultSpecsForSending // CHECK THIS BEFORE MERGING, if this comment exists then not tested
  userId?: string
}

export type PCRTestResultDBModel = PCRTestResultData & {
  appointmentId: string
  confirmed: boolean
  dateTime: firestore.Timestamp
  deadline: firestore.Timestamp
  displayInResult: boolean
  firstName: string
  id: string
  lastName: string
  linkedBarCodes: string[]
  organizationId?: string
  previousResult: ResultTypes
  recollected: boolean
  reCollectNumber: number
  result: ResultTypes
  runNumber: number
  testRunId?: string
  updatedAt: firestore.Timestamp
  waitingResult: boolean
  deadlineDate: firestore.Timestamp
  dateOfAppointment: firestore.Timestamp
  testType: TestTypes
  resultMetaData?: TestResultsMetaData
  resultAnalysis?: Spec[]
  templateId: string
  labId: string
  userId: string
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
  | 'id'
  | 'linkedBarCodes'
  | 'deadline'
  | 'previousResult'
  | 'runNumber'
  | 'reCollectNumber'
  | 'updatedAt'
  | 'deadlineDate'
  | 'dateOfAppointment'
  | 'userId'
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
  status: ResultReportStatus | ResultTypes
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
  appointmentStatus?:
    | AppointmentStatus.InProgress
    | AppointmentStatus.Received
    | AppointmentStatus.ReRunRequired
  organizationId?: string
}

export type SinglePcrTestResultsRequest = {
  pcrTestResultId?: string
}

export type SingleTestResultsRequest = {
  id: string
}

export type PcrTestResultsListRequest = {
  organizationId?: string
  deadline?: string
  barCode?: string
  result?: ResultTypes
  date?: string
  testType?: TestTypes
}

export type PCRTestResultListDTO = {
  id: string
  firstName: string
  lastName: string
  testType: string
  barCode: string
  result: ResultTypes
  previousResult?: ResultTypes
  vialLocation?: string
  status?: AppointmentStatus
  dateTime?: string
  deadline?: string
  testRunId?: string
  organizationId: string
  organizationName: string
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
  organizationName: string
}

export type pcrTestResultsDTO = {
  barCode: string
  status: ResultReportStatus | ResultTypes
  details?: string
}

export const pcrTestResultsResponse = (
  pcrTestResult: TestResultsReportingTrackerPCRResultsDBModel,
): pcrTestResultsDTO => ({
  barCode: pcrTestResult.data.barCode,
  status: pcrTestResult.status,
  details: pcrTestResult.details,
})

export const resultToStyle = (
  result: ResultTypes | PassportStatus | TemperatureStatusesUI,
): TestResultStyle => {
  return TestResultStyle[result] ? TestResultStyle[result] : TestResultStyle.AnyOther
}

export type TestResutsDTO = {
  id: string
  type: TestTypes
  name: string
  testDateTime: string
  style: TestResultStyle
  result: ResultTypes | PassportStatuses | TemperatureStatusesUI
  detailsAvailable: boolean
}

export type GroupedSpecs = {
  channelName: string
  description: string
  groups: Spec[]
}

type Spec = {
  label: string
  value: string | boolean | Date
}

export type SinglePcrTestResultUi = {
  firstName: string
  lastName: string
  email: string
  phone: string
  ohipCard?: string
  dateOfBirth: string
  address: string
  addressUnit?: string
  barCode: string
  appointmentStatus: string
  result: string
  dateTime: string
  registeredNursePractitioner?: string
  physician?: string
  locationName?: string
  swabMethod: string
  deadline: string
  labName: string
  testType: string
  equipment: string
  manufacturer: string
  resultSpecs: Spec[]
  style: TestResultStyle
  testName: string
  doctorId: string
  resultAnalysis: GroupedSpecs[]
}

enum LabData {
  labName = 'FH Health',
  testType = 'PCR',
  equipment = 'Allplex 2019-nCoV Assay',
  manufacturer = 'Seegeene Inc.',
}

export const singlePcrTestResultDTO = (
  pcrTestResult: PCRTestResultDBModel,
  appointment: AppointmentDBModel,
): SinglePcrTestResultUi => {
  let resultSpecs = null
  let resultAnalysis = null
  if (pcrTestResult.resultSpecs) {
    resultSpecs = Object.entries(pcrTestResult.resultSpecs).map(([resultKey, resultValue]) => ({
      label: resultKey,
      value: resultValue,
    }))
  }
  if (pcrTestResult.resultSpecs) {
    resultAnalysis = groupByChannel(
      Object.entries(pcrTestResult.resultSpecs).map(([resultKey, resultValue]) => ({
        label: resultKey,
        value: resultValue,
      })),
    )
  }
  return {
    email: appointment.email,
    firstName: appointment.firstName,
    lastName: appointment.lastName,
    phone: `${appointment.phone}`,
    ohipCard: appointment.ohipCard,
    dateOfBirth: appointment.dateOfBirth,
    address: appointment.address,
    addressUnit: appointment.addressUnit,
    barCode: pcrTestResult.barCode,
    appointmentStatus: appointment.appointmentStatus,
    result: pcrTestResult.result,
    dateTime: formatStringDateRFC822Local(pcrTestResult.dateTime.toDate()),
    registeredNursePractitioner: appointment.registeredNursePractitioner,
    physician: requisitionDoctor,
    locationName: appointment.locationName,
    swabMethod: appointment.swabMethod,
    deadline: formatStringDateRFC822Local(appointment.deadline.toDate()),
    labName: LabData.labName,
    testType: LabData.testType,
    equipment: LabData.equipment,
    manufacturer: LabData.manufacturer,
    resultSpecs: resultSpecs,
    resultAnalysis: resultAnalysis,
    style: resultToStyle(pcrTestResult.result),
    testName: 'SARS COV-2',
    doctorId: 'DR1',
  }
}
