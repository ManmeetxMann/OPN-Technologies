export enum RapidAntigenResultTypes {
  DoNothing = 'DoNothing',
  SendInconclusive = 'SendInconclusive',
  SendNegative = 'SendNegative',
  SendPositive = 'SendPositive',
}

export type RapidAntigenTestResultRequest = {
  appointmentID: string
  action: RapidAntigenResultTypes
  sendAgain: boolean
}
