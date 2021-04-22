export type ScheduleWebhookRequest = {
  id: number
  action: string
  calendarID: number
  appointmentTypeID: number
  returnData: boolean
}

export type AppointmentSyncRequest = {
  acuityID: number
  action: string
  calendarID: number
  appointmentTypeID: number
  returnData: boolean
}
