import admin from 'firebase-admin'

export enum PushNotificationType {
  APPOINTMENT = 'APPOINTMENT',
  RESULT = 'RESULT',
}

export type FHPushNotificationMessage = admin.messaging.Message & {
  data: FHPushNotificationMessageData
}

export type FHPushNotificationMessageData = {
  resultId?: string
  appointmentId?: string
  notificationType: PushNotificationType
}
