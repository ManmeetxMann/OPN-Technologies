import {AppointmentDBModel} from './appointment'
import {PCRTestResultDBModel} from './pcr-test-results'

export enum RapidAntigenResultTypes {
  DoNothing = 'DoNothing',
  SendInvalid = 'SendInvalid',
  SendNegative = 'SendNegative',
  SendPositive = 'SendPositive',
}

export type RapidAntigenTestResultRequest = {
  appointmentID: string
  action: RapidAntigenResultTypes
  sendAgain: boolean
  notify: boolean
}

export enum RapidAntigenResultPDFType {
  Positive = 'Positive',
  Negative = 'Negative',
}

export type RapidAntigenEmailResultDTO = Partial<
  Omit<
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
    AppointmentDBModel
>
