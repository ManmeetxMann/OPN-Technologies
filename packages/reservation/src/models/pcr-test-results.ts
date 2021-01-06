import {ResultTypes} from './appointment'

export enum PCRResultActions {
  DoNothing = 'DoNothing',
  ReRunToday = 'ReRunToday',
  ReRunTomorrow = 'ReRunTomorrow',
  RequestReSample = 'RequestReSample',
  MarkAsPositive = 'MarkAsPositive',
  MarkAsNegative = 'MarkAsNegative',
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

export type PCRTestResultRequest = {
  reportTrackerId?: string
  results: PCRTestResultData[]
  resultDate: Date
}
