import {firestore} from 'firebase-admin'
import moment from 'moment'

import {formatDateRFC822Local, formatStringDateRFC822Local} from '../utils/datetime.helper'

import {AppointmentDBModel, AppointmentStatus, ResultTypes, TestTypes} from './appointment'
import {Config} from '../../../common/src/utils/config'
import {safeTimestamp} from '../../../common/src/utils/datetime-util'
import {
  TestResultHistoryResponseDTO,
  TestResultRequestData,
  TestResultsMetaData,
} from './test-results'
import {groupByChannel} from '../utils/analysis.helper'
import {PassportStatus} from '../../../passport/src/models/passport'
import {TemperatureStatusesUI} from './temperature'
import {PulseOxygenStatuses} from './pulse-oxygen'
import {Lab} from './lab'

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
  Intermediate = 'Intermediate',
  PresumptivePositive = 'PresumptivePositive',
}

//Actions when Results are sent from Single OR Bulk
export enum PCRResultActions {
  SendThisResult = 'SendThisResult',
  DoNothing = 'DoNothing',
  ReRunToday = 'ReRunToday',
  ReRunTomorrow = 'ReRunTomorrow',
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
  MarkAsInvalid = 'MarkAsInvalid',
}

export enum PCRResultActionsAllowedResend {
  SendThisResult = 'SendThisResult',
  MarkAsPositive = 'MarkAsPositive',
  MarkAsNegative = 'MarkAsNegative',
  RecollectAsInconclusive = 'RecollectAsInconclusive',
  RecollectAsInvalid = 'RecollectAsInvalid',
  ReRunToday = 'ReRunToday',
  ReRunTomorrow = 'ReRunTomorrow',
  SendPreliminaryPositive = 'SendPreliminaryPositive',
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
  labId?: string
  byPassValidation: boolean
  adminId: string
}

export type PCRSendResultDTO = {
  adminId: string
  barCode: string
  isSingleResult: boolean
  labId: string
  metaData: TestResultsMetaData
  resultAnalysis: Spec[]
  sendUpdatedResults: boolean
  templateId: string
}

export enum TestResultStyle {
  // PCR result style
  PresumptivePositive = 'RED',
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
  Pending = 'BLACK',
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

export type PCRListQueryRequest = {
  barcode: string[]
}

export type PCRTestResultData = {
  barCode: string
  adminId: string
  resultSpecs?: PCRResultSpecsForSending // @TODO Cleanup this after migration
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
  templateId?: string
  labId?: string
  userId: string
  sortOrder: number
  appointmentStatus: AppointmentStatus
  couponCode?: string
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
  | 'sortOrder'
> &
  AppointmentDBModel & {labAssay: string}

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
  data: TestResultRequestData
  details?: string
}

export type CreateReportForPCRResultsResponse = {
  reportTrackerId: string
}

export const PCRTestResultHistoryResponse = (
  pcrTests: PCRTestResultHistory,
): TestResultHistoryResponseDTO => ({
  id: pcrTests.id,
  barCode: pcrTests.barCode,
  waitingResult: pcrTests.waitingResult,
  results: pcrTests.results.map((result) => ({
    resultAnalysis: result.resultAnalysis,
    result: result.result,
    resultMetaData: {
      autoResult: result.resultMetaData.autoResult,
      comment: result.resultMetaData.comment,
    },
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
  labId?: string
  testType?: TestTypes
}

export type SinglePcrTestResultsRequest = {
  pcrTestResultId?: string
}

export type SingleTestResultsRequest = {
  id: string
}

export type TestResultCommentParamRequest = {
  testResultId: string
}

export type TestResultReplyCommentParamRequest = {
  testResultId: string
  commentId: string
}

export type TestResultCommentBodyRequest = {
  comment: string
  attachmentUrls: string[]
  assignedTo?: string
  internal: boolean
}

export type TestResultReplyCommentBodyRequest = {
  reply: string
  attachmentUrls: string[]
}

export type PcrTestResultsListRequest = {
  organizationId?: string
  barCode?: string
  result?: ResultTypes
  date?: string
  testType?: TestTypes
  searchQuery?: string
  labId?: string
  userId?: string
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
  appointmentStatus: AppointmentStatus
  labName?: string
  labId?: string
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

export type ResultDictionary = {
  [index: string]: number
}

export const ResultOrder: ResultDictionary = {
  Positive: 8,
  PresumptivePositive: 7,
  PreliminaryPositive: 6,
  Invalid: 5,
  Inconclusive: 4,
  Indeterminate: 3,
  Pending: 2,
  Negative: 1,
}

export const pcrTestResultsResponse = (
  pcrTestResult: TestResultsReportingTrackerPCRResultsDBModel,
): pcrTestResultsDTO => ({
  barCode: pcrTestResult.data.barCode,
  status: pcrTestResult.status,
  details: pcrTestResult.details,
})

export type Result =
  | ResultTypes
  | PassportStatus
  | TemperatureStatusesUI
  | PulseOxygenStatuses
  | AppointmentReasons.InProgress

export const resultToStyle = (result: Result): TestResultStyle => {
  return TestResultStyle[result] ? TestResultStyle[result] : TestResultStyle.AnyOther
}

export type TestResutsDTO = {
  id: string
  type: TestTypes
  name: string
  testDateTime: string
  style: TestResultStyle
  result: Result
  detailsAvailable: boolean
}

export type GroupedSpecs = {
  channelName: string
  description: string
  groups: {
    label: string
    value?: string | boolean | Date
  }[]
}

export enum SpecLabel {
  famEGene = 'famEGene',
  famCt = 'famCt',
  calRed61RdRpGene = 'calRed61RdRpGene',
  calRed61Ct = 'calRed61Ct',
  hexIC = 'hexIC',
  hexCt = 'hexCt',
  quasar670NGene = 'quasar670NGene',
  quasar670Ct = 'quasar670Ct',
  ORF1abCt = 'ORF1abCt',
  NGeneCt = 'NGeneCt',
  SGeneCt = 'SGeneCt',
  MS2Ct = 'MS2Ct',
  ORF1ab = 'ORF1ab',
  NGene = 'NGene',
  SGene = 'SGene',
  MS2 = 'MS2',
  IgAResult = 'IgAResult',
  IgGResult = 'IgGResult',
  IgMResult = 'IgMResult',
  IgA = 'IgA',
  IgG = 'IgG',
  IgM = 'IgM',
}

export enum GroupLabel {
  FAM = 'FAM',
  calRed = 'calRed',
  HEX = 'HEX',
  quasar = 'quasar',
}

export type Spec = {
  label: SpecLabel
  value?: string | boolean | Date
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
  resultSpecs: Spec[]
  style: TestResultStyle
  testName: string
  doctorId: string
  resultAnalysis: GroupedSpecs[]
  travelID: string
  travelIDIssuingCountry: string
  dateOfResult: string
  resultMetaData: TestResultsMetaData
  couponCode?: string
  status?: string
  antibodySpecimenType?: string
  methodology?: string
  indication?: string
}

export const singlePcrTestResultDTO = (
  pcrTestResult: PCRTestResultDBModel,
  appointment: AppointmentDBModel,
  lab: Omit<Lab, 'id'>,
): SinglePcrTestResultUi => {
  let resultSpecs = null
  let resultAnalysis = null

  const getAnalysis = (pcrTestResult: PCRTestResultDBModel): Spec[] => {
    if (
      pcrTestResult.testType === TestTypes.Antibody_All &&
      (pcrTestResult.result === ResultTypes.Positive ||
        pcrTestResult.result === ResultTypes.Inconclusive)
    ) {
      return pcrTestResult.resultAnalysis.map(({label, value}) => {
        if (label === SpecLabel.IgG || label === SpecLabel.IgM) {
          return {
            label,
          }
        }
        return {
          label,
          value,
        }
      })
    }

    return pcrTestResult.resultAnalysis
  }
  if (pcrTestResult.resultSpecs) {
    resultSpecs = Object.entries(pcrTestResult.resultSpecs).map(([resultKey, resultValue]) => ({
      label: resultKey,
      value: resultValue,
    }))
  }
  if (pcrTestResult.resultSpecs) {
    resultAnalysis = groupByChannel(
      Object.entries(pcrTestResult.resultSpecs).map(([resultKey, resultValue]) => ({
        label: resultKey as SpecLabel,
        value: resultValue,
      })),
    )
  } else if (pcrTestResult.resultAnalysis) {
    resultAnalysis = groupByChannel(getAnalysis(pcrTestResult))
  }

  let isBirthDateParsable: boolean
  try {
    isBirthDateParsable = moment(appointment.dateOfBirth).isValid()
  } catch (e) {
    isBirthDateParsable = false
  }

  let status

  if (
    pcrTestResult?.couponCode &&
    [AppointmentStatus.ReCollectRequired, AppointmentStatus.ReRunRequired].includes(
      pcrTestResult.appointmentStatus,
    )
  ) {
    status =
      pcrTestResult.appointmentStatus === AppointmentStatus.ReRunRequired
        ? 'Re-Run'
        : 'Re-Collection'
  }

  const isAntibodyOrAntigen = [
    TestTypes.Antibody_All,
    TestTypes.Antibody_IgM,
    TestTypes.RapidAntigen,
    TestTypes.EmergencyRapidAntigen,
    TestTypes.RapidAntigenAtHome,
  ].includes(pcrTestResult.testType)

  return {
    email: appointment.email,
    firstName: appointment.firstName,
    lastName: appointment.lastName,
    phone: `${appointment.phone}`,
    ohipCard: appointment.ohipCard || 'N/A',
    dateOfBirth: isBirthDateParsable
      ? moment(appointment.dateOfBirth).format('LL')
      : appointment.dateOfBirth,
    address: appointment.address,
    addressUnit: appointment.addressUnit,
    barCode: pcrTestResult.barCode,
    appointmentStatus: appointment.appointmentStatus,
    result: pcrTestResult.result,
    dateTime: formatStringDateRFC822Local(pcrTestResult.dateTime.toDate()),
    registeredNursePractitioner: appointment.registeredNursePractitioner || 'N/A',
    physician: requisitionDoctor || 'N/A',
    locationName: appointment.locationName || 'N/A',
    swabMethod: appointment.swabMethod || 'N/A',
    deadline: formatStringDateRFC822Local(appointment.deadline.toDate()),
    labName: lab?.name,
    testType: pcrTestResult.testType,
    equipment: lab?.assay,
    resultSpecs: resultSpecs,
    resultAnalysis: resultAnalysis,
    style: resultToStyle(pcrTestResult.result),
    testName: 'SARS COV-2',
    doctorId: 'DR1',
    travelID: appointment.travelID.trim() ? appointment.travelID : 'N/A',
    travelIDIssuingCountry: appointment.travelIDIssuingCountry.trim()
      ? appointment.travelIDIssuingCountry
      : 'N/A',
    dateOfResult: pcrTestResult.resultMetaData
      ? formatStringDateRFC822Local(safeTimestamp(pcrTestResult.resultMetaData.resultDate))
      : 'N/A',
    resultMetaData: pcrTestResult.resultMetaData,
    couponCode: pcrTestResult?.couponCode,
    status,
    antibodySpecimenType: isAntibodyOrAntigen ? 'Serum' : 'N/A',
    methodology: isAntibodyOrAntigen ? 'Chemiluminescence' : 'N/A',
    indication: isAntibodyOrAntigen ? 'Suspected Exposure to COVID-19' : 'N/A',
  }
}

export enum AntiBodyFieldsToCheckResults {
  IgAResult = 'IgAResult',
  IgGResult = 'IgGResult',
  IgMResult = 'IgMResult',
}

export enum AnalyseTypes {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
  INDETERMINATE = 'INDETERMINATE',
}

export type ActivityTracking = {
  action: PcrResultTestActivityAction
  currentData: Partial<PCRTestResultDBModel>
  newData: Partial<PCRTestResultDBModel>
  actionBy?: string // not required for action updateFromAcuity
}

export enum PcrResultTestActivityAction {
  RegenerateBarcode = 'regenerateBarcode',
  UpdateFromAcuity = 'updateFromAcuity',
  Create = 'create',
  ConfirmResult = 'confirmResult',
  UpdateFromPackage = 'updateFromPackage',
  AddTestRun = 'addTestRun',
  UpdateFromAppointment = 'updateFromAppointment',
  ResetOldResults = 'resetOldResults',
  UpdateFromRapidAntigen = 'updateFromRapidAntigen',
}

export type UpdatePcrTestResultActionParams = {
  id: string
  updates: Partial<PCRTestResultDBModel>
  action?: PcrResultTestActivityAction
  actionBy?: string
}

export type ActivityTrackingDb = ActivityTracking & {
  id: string
}
// determine priority in test Order based on result
export const getSortOrderByResult = (result: string): number => ResultOrder[result]

export type PCRTestResultSubmitted = {
  id: string
  result: ResultTypes
  date: string
  userId: string
  organizationId: string
  actionType: PCRResultActions | EmailNotficationTypes
  phone: string
  firstName: string
}
