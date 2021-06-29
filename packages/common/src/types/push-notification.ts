import admin from 'firebase-admin'

export type PushMessages = admin.messaging.Message & {
  data: PushNotificationMessageData
  token?: string
}

export type DbBatchAppointments = {
  appointmentId: string
  scheduledAppointmentType: number
}

export enum PushNotificationType {
  APPOINTMENT = 'APPOINTMENT',
  RESULT = 'RESULT',
  GROUP = 'GROUP',
}

export type PushNotificationMessageData = {
  resultId?: string
  appointmentId?: string
  notificationType: PushNotificationType
  title: string
  body: string
}
