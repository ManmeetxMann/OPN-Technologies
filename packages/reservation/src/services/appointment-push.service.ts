//Libs
import moment from 'moment'
import * as _ from 'lodash'

//Common
import {sendBulkMessagesByToken} from '../../../common/src/service/messaging/push-notify-service'
import {Config} from '../../../common/src/utils/config'

//Services
import {RegistrationService} from '../../../common/src/service/registry/registration-service'
import {AppoinmentService} from '../services/appoinment.service'

//Types
import {AppointmentPushTypes} from '../types/appointment-push'
import {PushMessages} from '../../../common/src/types/push-notification'
import {Registration} from '../../../common/src/data/registration'
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
  private registrationService = new RegistrationService()
  private appointmentService = new AppoinmentService()
  private timeZone = Config.get('DEFAULT_TIME_ZONE')
  // DB collection maximum query size
  private maxUntilHours = 24
  // In case push didn't worked 24 or 4 hours before appointment, send it max after:
  private maxNotifyShiftHours = 1

  private messageBeforeHours = {
    [AppointmentPushTypes.before24hours]: 24,
    [AppointmentPushTypes.before3hours]: 3,
  }

  private messagesBody: {[index: number]: Function} = {
    [AppointmentPushTypes.before24hours]: (dateTime, clinicName) =>
      `Copy: You have a Covid-19 test scheduled for ${dateTime} at our ${clinicName} location.`,
    [AppointmentPushTypes.before3hours]: (dateTime, clinicName) =>
      `Your Covid-19 test is scheduled for today at ${dateTime} at our ${clinicName} location.`,
    [AppointmentPushTypes.ready]: () => `Your Covid-19 test result is ready. Tap here to view.`,
    [AppointmentPushTypes.reSample]: () =>
      `We need another sample to complete your Covid-19 test. Please book another appointment.`,
  }

  /**
   * Gets resent push token for user
   */
  private getRecentUsersToken(registrations: Registration[]): {[userId: string]: string} {
    const orderedRegistrations: Registration[] = _.sortBy(registrations, (registration) =>
      registration.timestamps.createdAt.toDate(),
    ).reverse()
    // Take all uniq userIds from all registrations
    const userIds = orderedRegistrations.map((registration) => registration.userIds)
    const uniqueUserIds = _.uniq([].concat.apply([], userIds))

    // Get first from ordered by date token for each user
    const userTokens: {[userId: string]: string} = {}
    uniqueUserIds.forEach((userId) => {
      userTokens[userId] = orderedRegistrations.find((orderedRegistration) =>
        orderedRegistration.userIds.includes(userId),
      ).pushToken
    })

    return userTokens
  }

  /**
   * Checks is message wasn't already send and if is withing offset to send
   */
  private isMessageToSend = (
    appointment,
    hoursOffset: number,
    appointmentType: AppointmentPushTypes,
  ): boolean => {
    const nowDateTime = moment(new Date()).tz(this.timeZone)
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

  /**
   * Builds a list of push notification to send for appointment reminder
   */
  async fetchUpcomingPushes(): Promise<UpcomingPushes> {
    const nowDateTime = moment(new Date()).tz(this.timeZone)
    const untilDateTime = nowDateTime.clone().add(this.maxUntilHours, 'hours')

    // Fetch upcoming appointment, Fetch recent token for each unique userIds
    const appointments = await this.appointmentService.getAppointmentsNotNotifiedInPeriod(
      nowDateTime,
      untilDateTime,
    )
    const userIds = _.uniq(appointments.map((appointment) => appointment.userId))
    const tokens = await this.registrationService.findForUserIds(userIds)
    const recentUserToken = this.getRecentUsersToken(tokens)

    // Add auxiliary information for appointment and only required fields
    const appointmentsWithMeta: Array<{
      locationName: string
      dateTime: string
      userId: string
      scheduledPushesToSend: number[]
      pushToken: string
    }> = _.map(appointments, (appointment) => ({
      ..._.pick(appointment, ['id', 'userId', 'locationName', 'scheduledPushesToSend']),
      dateTime: appointment.dateTime.toDate(),
      pushToken: recentUserToken[appointment.userId],
    }))

    // Build push tokens on time logic
    const pushMessages: PushMessages[] = []
    appointmentsWithMeta.forEach((appointment) => {
      // Each reminder type
      for (const appointmentPushType in this.messageBeforeHours) {
        const hours = this.messageBeforeHours[appointmentPushType]
        if (this.isMessageToSend(appointment, hours, AppointmentPushTypes[appointmentPushType])) {
          pushMessages.push({
            recipientToken: appointment.pushToken,
            title: 'TODO title',
            body: this.messagesBody[AppointmentPushTypes[appointmentPushType]](
              appointment.dateTime,
              appointment.locationName,
            ),
          })
        }
      }
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
