import {PushMessages, PushNotificationType} from '../../../common/src/types/push-notification'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'

import {AppointmentStatus} from '../models/appointment'
import {PCRTestResultEmailDTO} from '../models/pcr-test-results'

export const getNotificationBody = (testResult: PCRTestResultEmailDTO): string => {
  switch (testResult.appointmentStatus) {
    case AppointmentStatus.Canceled:
      return `Appointment for ${testResult.firstName} ${testResult.lastName} has been cancelled that was previously scheduled for ${testResult.dateOfAppointment}`

    case AppointmentStatus.Pending:
      return `Pending`

    case AppointmentStatus.InProgress:
      return `Your result are in-progress for the specimens collected for ${testResult.firstName} ${testResult.lastName} on ${testResult.dateOfAppointment} at ${testResult.timeOfAppointment}. As soon as results are available you will receive notification in real time.`

    case AppointmentStatus.Reported:
      return `Your Covid-19 test result is ready. Tap here to view.`

    case AppointmentStatus.ReRunRequired:
      return `The speciment that had been collected on ${testResult.dateOfAppointment} at ${testResult.timeOfAppointment} needs to be re-run as part of our quality control measures, and as such your results will be delayed. Tap here for more details.`

    case AppointmentStatus.ReCollectRequired:
      return `The speciment that had been collected on ${testResult.firstName} ${testResult.lastName} experienced a technical control failure and in order to complete a successful test we require a new sample. Tap here for more details.`

    default:
      throw new BadRequestException(
        `Appointment status ${testResult.appointmentStatus} not supported`,
      )
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

    default:
      throw new BadRequestException(
        `Appointment status ${testResult.appointmentStatus} not supported`,
      )
  }
}

export const getPushNotificationType = (
  result: PCRTestResultEmailDTO,
  message: PushMessages,
): PushMessages => {
  switch (result.appointmentStatus) {
    case AppointmentStatus.Canceled:
      message.data.notificationType = PushNotificationType.RESULT
      break

    case AppointmentStatus.Pending:
      message.data.notificationType = PushNotificationType.RESULT
      break

    case AppointmentStatus.InProgress:
      message.data.notificationType = PushNotificationType.RESULT
      message.data.resultId = result.id
      break

    case AppointmentStatus.Reported:
      message.data.notificationType = PushNotificationType.RESULT
      message.data.resultId = result.id
      break

    case AppointmentStatus.ReCollectRequired:
      message.data.notificationType = PushNotificationType.RESULT
      message.data.resultId = result.id
      break

    case AppointmentStatus.ReRunRequired:
      message.data.notificationType = PushNotificationType.RESULT
      message.data.resultId = result.id
      break

    default:
      throw new BadRequestException(`Appointment status ${result.appointmentStatus} not supported`)
  }

  return message
}
