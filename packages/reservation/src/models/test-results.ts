import {ResultTypes} from './appointment'
import {AppointmentReasons, PCRResultActions, Spec} from './pcr-test-results'
import {firestore} from 'firebase-admin'

export type TestResultSpecsForSending = {
  action: PCRResultActions
  autoResult: ResultTypes
  notify: boolean
  resultDate: Date
  resultAnalysis: Spec[]
  comment: string
}

export enum TemplateTypes {
  pcr1 = 'PCR-1',
  pcr2 = 'PCR-2',
  antiBody = 'Anti-Body',
}

export type TestResultRequestData = TestResultSpecsForSending & {
  barCode: string
  sendUpdatedResults?: boolean
  templateId: TemplateTypes
  labId: string
  fileName?: string
}

export type TestResultsMetaData = {
  notify: boolean
  resultDate: Date | string
  action: PCRResultActions
  autoResult: ResultTypes
  comment?: string
}

export type BulkTestResultRequest = {
  reportTrackerId?: string
  results: TestResultRequestData[]
  resultDate: Date
  templateId: TemplateTypes
  labId: string
  fileName?: string
}

type ResultSpecs = {
  resultAnalysis: Spec[]
  comment?: string
}

type ResultsForHistory = ResultSpecs & {
  barCode: string
  dateTime: firestore.Timestamp | string
  reCollectNumber: string
  result: string
  runNumber: string
  resultMetaData: {
    autoResult: string
    comment: string
  }
}

export type TestResultHistoryResponseDTO = {
  id: string
  barCode: string
  waitingResult: boolean
  results: ResultsForHistory[]
  reason?: AppointmentReasons
  reCollectNumber: string
  runNumber: string
  dateTime: string
}
