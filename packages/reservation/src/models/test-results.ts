import {ResultTypes} from './appointment'
import {PCRResultActions} from './pcr-test-results'
import {Spec} from '../utils/analysis.helper'

export type TestResultSpecsForSending = {
  action: PCRResultActions
  autoResult: ResultTypes
  notify: boolean
  resultDate: Date
  resultAnalysis: Spec[]
}

export type TestResultRequestData = TestResultSpecsForSending & {
  barCode: string
  sendUpdatedResults?: boolean
}

export type TestResultsMetaData = {
  notify: boolean
  resultDate: Date
  action: PCRResultActions
  autoResult: ResultTypes
}
