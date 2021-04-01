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
interface SelectExecutionStats {
  notNotifiedAppointments?: number
  users: number
  totalPushTokens: number
  recentUserTokens: number
  pushesToSend: number
}

interface SendExecutionStats {
  successSend: number
  successScheduledRemoved: number
}

interface UpcomingPushes {
  SelectExecutionStats: SelectExecutionStats
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
  // Max size of pushes to send to FCM in one call and to batch update
  private pushSenderChunkSize = 500

  private messageBeforeHours = {
    [AppointmentPushTypes.before24hours]: 24,
    [AppointmentPushTypes.before3hours]: 3,
  }

  private messageTitle = 'TODO title'
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
    const needsSend = appointment.scheduledPushesToSend?.some((scheduledPushes) => {
      return scheduledPushes === AppointmentPushTypes[appointmentType]
    })
    const isInTimeSpan = moment(appointment.dateTime).isBetween(
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
      id: string
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
            token: appointment.pushToken,
            notification: {
              title: this.messageTitle,
              body: this.messagesBody[appointmentPushType](
                appointment.dateTime,
                appointment.locationName,
              ),
            },
            data: {
              appointmentId: appointment.id,
              scheduledAppointmentType: appointmentPushType,
            },
          })
        }
      }
    })

    const SelectExecutionStats = {
      notNotifiedAppointments: appointments.length,
      users: userIds.length,
      totalPushTokens: tokens.length,
      recentUserTokens: Object.keys(recentUserToken).length,
      pushesToSend: pushMessages.length,
    }

    return {
      SelectExecutionStats,
      pushMessages,
    }
  }

  /**
   * Sends push messages and updates scheduledPushesToSend to avoid duplicated pushes
   * TODO:
   * 1. DB transactions if method needs to run in parallel
   */
  async sendPushUpdateScheduled(pushMessages: PushMessages[]): Promise<SendExecutionStats> {
    const chunks: PushMessages[][] = _.chunk(pushMessages, this.pushSenderChunkSize)

    chunks.forEach(async (messageChunk) => {
      // Send chunk of pushes
      const pushResult = await sendBulkMessagesByToken(messageChunk)
      const batchAppointments: {
        appointmentId: string
        scheduledAppointmentType: number
      }[] = []

      pushResult.responses.forEach((el, index) => {
        const pushStatus = messageChunk[index]
        const {appointmentId, scheduledAppointmentType} = pushStatus.data

        batchAppointments.push({
          appointmentId,
          scheduledAppointmentType: Number(scheduledAppointmentType),
        })
      })

      const dbResult = await this.appointmentService.removeBatchScheduledPushesToSend(
        batchAppointments,
      )
    })

    return null
  }
}
