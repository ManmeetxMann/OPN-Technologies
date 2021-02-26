import {AppointmentDBModel} from './appointment'

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
}

export enum RapidAlergenResultPDFType {
  Positive = 'Positive',
  Negative = 'Negative',
}

export type RapidAntigenEmailResultDTO = AppointmentDBModel
