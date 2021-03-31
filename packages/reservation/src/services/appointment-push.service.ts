//Libs
import moment from 'moment'
import * as _ from 'lodash'

//Common
import {sendBulkMessagesByToken} from '../../../common/src/service/messaging/push-notify-service'
import {Config} from '../../../common/src/utils/config'

//Services
import {RegistrationService} from '../../../common/src/service/registry/registration-service'
import {AppoinmentService} from '../services/appoinment.service'
import {LabService} from './lab.service'

//Types
import {AppointmentPushTypes} from '../types/appointment-push'
import {PushMessages} from '../../../common/src/types/push-notification'
import {app} from '../app'

/**
 * TODO:
 * 1. Message title
 */
interface ExecutionStats {
  notNotifiedAppointments?: number
  users?: number
  tokens?: number
}

interface UpcomingPushes {
  executionStats: ExecutionStats
  pushMessages: PushMessages[]
}

export class AppointmentPushService {
  private labService = new LabService()
  private registrationService = new RegistrationService()
  private appointmentService = new AppoinmentService()
  private timeZone = Config.get('DEFAULT_TIME_ZONE')
  // DB collection maximum query size
  private maxUntilHours = 24
  // In case push didn't worked 24 or 4 hours before appointment, send it max after:
  private maxNotifyShiftHours = 1

  private messagesBody: {[index: number]: Function} = {
    [AppointmentPushTypes.before24hours]: (dateTime, clinicName) =>
      `Copy: You have a Covid-19 test scheduled for ${dateTime} at our ${clinicName} location.`,
    [AppointmentPushTypes.before3hours]: (dateTime, clinicName) =>
      `Your Covid-19 test is scheduled for today at ${dateTime} at our ${clinicName} location.`,
    [AppointmentPushTypes.ready]: () => `Your Covid-19 test result is ready. Tap here to view.`,
    [AppointmentPushTypes.reSample]: () =>
      `We need another sample to complete your Covid-19 test. Please book another appointment.`,
  }
  async fetchUpcomingPushes(): Promise<UpcomingPushes> {
    const nowDateTime = moment(new Date()).tz(this.timeZone)
    const untilDateTime = nowDateTime.clone().add(this.maxUntilHours, 'hours')

    // Fetch upcoming appointment and merge with labs
    const appointments = await this.appointmentService.getAppointmentsNotNotifiedInPeriod(
      nowDateTime,
      untilDateTime,
    )

    const appointmentsWithMeta: {
      [userId: string]: {
        locationName: string
        dateTime: string
        userId: string
        scheduledPushesToSend: number[]
      }
    } = _.keyBy(
      _.map(appointments, (appointment) => ({
        ..._.pick(appointment, ['id', 'userId', 'locationName', 'scheduledPushesToSend']),
        dateTime: appointment.dateTime.toDate(),
      })),
      'userId',
    )

    // Fetch all tokens for user
    const userIds = _.uniq(
      Object.keys(appointmentsWithMeta).map(
        (appointmentId) => appointmentsWithMeta[appointmentId].userId,
      ),
    )
    const tokens = await this.registrationService.findForUserIds(userIds)
    const recentToken = _.uniq(
      _.sortBy(tokens, (token) => token.timestamps.createdAt.toDate()),
      (token) => token.recipientToken,
    )

    console.log(recentToken)

    // Build push tokens on time logic
    const pushMessages: PushMessages[] = []
    const isMessageToSend = (
      appointment,
      hoursOffset: number,
      appointmentType: AppointmentPushTypes,
    ): boolean => {
      const needsSend = appointment.scheduledPushesToSend?.some(
        (scheduledPushes) => scheduledPushes === appointmentType,
      )
      const isInTimeSpan = moment(appointment.dateTime)
        .tz(this.timeZone)
        .isBetween(
          nowDateTime.clone().add(hoursOffset - this.maxNotifyShiftHours, 'hours'),
          nowDateTime.clone().add(hoursOffset, 'hours'),
        )

      return needsSend && isInTimeSpan
    }

    recentToken.forEach((token) => {
      token.userIds.forEach((userIds: string) => {
        // Skip if use doesn't have appointment
        if (!(userIds in appointmentsWithMeta)) {
          return false
        }
        const appointment = appointmentsWithMeta[userIds]

        if (isMessageToSend(appointment, 24, AppointmentPushTypes.before24hours)) {
          pushMessages.push({
            recipientToken: token.pushToken,
            title: 'TODO title',
            body: this.messagesBody[AppointmentPushTypes.before24hours](
              appointment.dateTime,
              appointment.locationName,
            ),
          })
        } else if (isMessageToSend(appointment, 3, AppointmentPushTypes.before3hours)) {
          pushMessages.push({
            recipientToken: token.pushToken,
            title: 'TODO title',
            body: this.messagesBody[AppointmentPushTypes.before3hours](
              appointment.dateTime,
              appointment.locationName,
            ),
          })
        }
      })
    })

    const executionStats = {
      notNotifiedAppointments: appointments.length,
      users: userIds.length,
      tokens: tokens.length,
    }

    return {
      executionStats,
      pushMessages,
    }
  }
}
