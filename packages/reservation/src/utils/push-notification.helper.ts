import admin from 'firebase-admin'

import {AppointmentStatus} from '../models/appointment'
import {PCRTestResultEmailDTO} from '../models/pcr-test-results'
import {PushNotificationType} from '../types/push-notification.type'

export const getNotificationBody = (testResult: PCRTestResultEmailDTO): string => {
  switch (testResult.appointmentStatus) {
    case AppointmentStatus.Canceled:
      return `Appointment for ${testResult.firstName} ${testResult.lastName} has been cancelled that was previously scheduled for ${testResult.dateOfAppointment}`

    case AppointmentStatus.Pending:
      return `Pending`

    case AppointmentStatus.InProgress:
      return `Your result are in-progress for the specimens collected for ${testResult.firstName} ${testResult.lastName} on ${testResult.dateOfAppointment} at ${testResult.timeOfAppointment}. As soon as results are available you will receive notification in real time.`

    case AppointmentStatus.Reported:
      return `A result for ${testResult.firstName} ${
        testResult.lastName
      } has come back ${testResult.result.toLocaleUpperCase()}. The speciment had been collected on ${
        testResult.dateOfAppointment
      } at ${testResult.timeOfAppointment}. Tap for more details.`

    case AppointmentStatus.ReRunRequired:
      return `The speciment that had been collected on ${testResult.dateOfAppointment} at ${testResult.timeOfAppointment} needs to be re-run as part of our quality control measures, and as such your results will be delayed. Tap here for more details.`

    case AppointmentStatus.ReCollectRequired:
      return `The speciment that had been collected on ${testResult.firstName} ${testResult.lastName} experienced a technical control failure and in order to complete a successful test we require a new sample. Tap here for more details.`
  }
}

export const getNotificationTitle = (testResult: PCRTestResultEmailDTO): string => {
  switch (testResult.appointmentStatus) {
    case AppointmentStatus.Canceled:
      return 'Cancelled Appointment'

    case AppointmentStatus.Pending:
      return `Update: Test Sample Collected`

    case AppointmentStatus.InProgress:
      return 'Update: Test Sample In-Progress'

    case AppointmentStatus.Reported:
      return 'Update: Result Available'

    case AppointmentStatus.ReRunRequired:
      return 'Update: Result Delay'

    case AppointmentStatus.ReCollectRequired:
      return 'Update: Re-collection Required'
  }
}

export const getPushNotificationType = (
  result: PCRTestResultEmailDTO,
  message: admin.messaging.Message,
): admin.messaging.Message => {
  switch (result.appointmentStatus) {
    case AppointmentStatus.Canceled:
      message.data.notificationType = PushNotificationType.LISTING
      break

    case AppointmentStatus.Pending:
      message.data.notificationType = PushNotificationType.LISTING
      break

    case AppointmentStatus.InProgress:
      message.data.notificationType = PushNotificationType.VIEW
      message.data.resultId = result.id
      break

    case AppointmentStatus.Reported:
      message.data.notificationType = PushNotificationType.VIEW
      message.data.resultId = result.id
      break

    case AppointmentStatus.ReCollectRequired:
      message.data.notificationType = PushNotificationType.VIEW
      message.data.resultId = result.id
      break

    case AppointmentStatus.ReCollectRequired:
      message.data.notificationType = PushNotificationType.VIEW
      message.data.resultId = result.id
      break
  }

  return message
}
