import { PCRTestResultData } from "./pcr-test-results"

export enum ResultReportStatus {
  RequestReceived = 'RequestReceived',
  Processing = 'Processing',
  Failed = 'Failed',
  SuccessfullyReported = 'SuccessfullyReported'
}

export type TestResultsReportingTrackerDBModel = {
  id:string
}

type PCRTestResultDataWithDate = PCRTestResultData & {
  resultDate: Date
}

export type TestResultsReportingTrackerPCRResultsDBModel = {
  id: string
  status: ResultReportStatus
  data: PCRTestResultDataWithDate
  details?:string
}

export type CreateReportForPCRResultsResponse = {
  reportTrackerId: string
}