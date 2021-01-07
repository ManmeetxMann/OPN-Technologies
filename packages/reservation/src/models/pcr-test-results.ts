import { type } from 'os'
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

export type PCRTestResultData = {
  action: PCRResultActions
  autoResult: ResultTypes
  barCode: string
  calRed61Ct: string
  calRed61RdRpGene: string
  famCt: string
  famEGene: string
  hexCt: string
  hexIC: string
  notify: boolean
  quasar670Ct: string
  quasar670NGene: string
}

export type PCRTestResultDBModel = Omit<PCRTestResultData, "action"|"notify"> & {
  id: string
  result: ResultTypes
  firstName: string
  lastName: string
  appointmentId: string
}

export type PCRTestResultRequest = {
  reportTrackerId?: string
  results: PCRTestResultData[]
  resultDate: Date
}

export type ProcessPCRResultRequest = {
  reportTrackerId: string,
  resultId: string
}

export type TestResultsReportingTrackerDBModel = {
  id: string
}

type PCRTestResultDataWithDate = PCRTestResultData & {
  resultDate: Date
}

export type TestResultsReportingTrackerPCRResultsDBModel = {
  id: string
  status: ResultReportStatus
  data: PCRTestResultDataWithDate
  details?: string
}

export type CreateReportForPCRResultsResponse = {
  reportTrackerId: string
}

