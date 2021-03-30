export enum AppointmentPushTypes {
  before24hours,
  before3hours,
  ready,
  reSample,
}

export type PushMeta = {
  recipientToken: string
  dateTime: string
  clinicName: string
}
