import {AppointmentStatus, ResultTypes} from './appointment'

export enum PCRResultActions {
  SendThisResult = 'SendThisResult',
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
  organizationId: string
  dateOfAppointment: string
}

export type PCRTestResultDBModel = PCRTestResultData &
  AppointmentDataForPCRResult & {
    id: string
    linkedBarCodes: string[]
    result: ResultTypes
    waitingResult: boolean
    displayForNonAdmins: boolean
    deadline: string
    testRunId?: string
  }

export type PCRTestResultLinkedDBModel = PCRTestResultDBModel & {
  linkedResults?: PCRTestResultDBModel[]
}

export type PCRTestResultHistoryDTO = {
  id: string
  barCode: string
  waitingResult: boolean
  results: PCRResults[]
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
}

export type PCRTestResultEmailDTO = Omit<
  PCRTestResultDBModel,
  'id' | 'linkedBarCodes' | 'deadline'
> & {
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
  })),
})

export type PcrTestResultsListByDeadlineRequest = {
  deadline: string
}

export type PcrTestResultsListRequest = {
  organizationId?: string
  dateOfAppointment: string
  deadline?: string
  testRunId?: string
}

export type PCRTestResultListDTO = {
  id: string
  firstName: string
  lastName: string
  testType: string
  dateOfAppointment: string
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
  result: ResultTypes
  vialLocation: string
  status: AppointmentStatus
  dateTime: string
  deadline: string
  testRunId: string
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
}

export const pcrTestResultsResponse = (
  pcrTestResult: TestResultsReportingTrackerPCRResultsDBModel,
): pcrTestResultsDTO => ({
  barCode: pcrTestResult.data.barCode,
  status: pcrTestResult.status,
})
