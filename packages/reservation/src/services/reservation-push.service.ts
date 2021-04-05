//Libs
import moment from 'moment'
import * as _ from 'lodash'

//Common
import {sendBulkPushByToken} from '../../../common/src/service/messaging/push-notify-service'
import {Config} from '../../../common/src/utils/config'
import {now} from '../../../common/src/utils/times'

//Services
import {RegistrationService} from '../../../common/src/service/registry/registration-service'
import {AppoinmentService} from './appoinment.service'

//Types
import {ReservationPushTypes} from '../types/appointment-push'
import {PushMessages, DbBatchAppointments} from '../../../common/src/types/push-notification'
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
  push: {
    successCount: number
    failureCount: number
  }
  db: {
    scheduledPushesToSendRemovedSuccess: number
  }
}

interface UpcomingPushes {
  selectExecutionStats: SelectExecutionStats
  pushMessages: PushMessages[]
}

interface AppointmentWithMeta {
  id: string
  locationName: string
  dateTime: string
  userId: string
  scheduledPushesToSend: number[]
  pushToken: string
}

export class ReservationPushService {
  private registrationService = new RegistrationService()
  private appointmentService = new AppoinmentService()
  private timeZone = Config.get('DEFAULT_TIME_ZONE')
  // DB collection maximum query size
  private maxUntilHours = 24
  // In case push didn't worked 24 or 4 hours before appointment, send it max after:
  private maxNotifyShiftHours = 1
  // Max size of pushes to send to FCM in one call and to batch update
  private pushSenderChunkSize = 1

  private messageBeforeHours = {
    [ReservationPushTypes.before24hours]: 24,
    [ReservationPushTypes.before3hours]: 3,
  }

  private messageTitle = {
    [ReservationPushTypes.before24hours]: 'Upcoming Covid-19 Test',
    [ReservationPushTypes.before3hours]: 'Your Covid-19 Test is Today',
    [ReservationPushTypes.ready]: 'Covid-19 Test Results',
    [ReservationPushTypes.reSample]: 'Covid-19 Resample Required',
  }
  private messagesBody = {
    [ReservationPushTypes.before24hours]: (dateTime, clinicName) =>
      `You have a Covid-19 test scheduled for ${dateTime} at our ${clinicName} location.`,
    [ReservationPushTypes.before3hours]: (dateTime, clinicName) =>
      `Your Covid-19 test is scheduled for today at ${dateTime} at our ${clinicName} location.`,
    [ReservationPushTypes.ready]: () => `Your Covid-19 test result is ready. Tap here to view.`,
    [ReservationPushTypes.reSample]: () =>
      `We need another sample to complete your Covid-19 test. Please book another appointment.`,
  }

  /**
   * Gets recent push token for user
   */
  private getRecentUsersToken(registrations: Registration[]): {[userId: string]: string} {
    const orderedRegistrations: Registration[] = _.sortBy(registrations, (registration) =>
      registration.timestamps.createdAt.toDate(),
    ).reverse()
    // Take all uniq userIds from all registrations
    const userIds = orderedRegistrations.map((registration) => registration.userIds)
    const uniqueUserIds = _.uniq([].concat(...userIds))

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
    appointmentType: ReservationPushTypes,
  ): boolean => {
    const nowDateTime = moment(now()).tz(this.timeZone)
    const needsSend = appointment.scheduledPushesToSend?.some((scheduledPushes) => {
      return scheduledPushes === ReservationPushTypes[appointmentType]
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
    const nowDateTime = moment(now()).tz(this.timeZone)
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
    const appointmentsWithMeta: AppointmentWithMeta[] = _.map(appointments, (appointment) => ({
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
        if (this.isMessageToSend(appointment, hours, ReservationPushTypes[appointmentPushType])) {
          pushMessages.push({
            token: appointment.pushToken,
            notification: {
              title: this.messageTitle[appointmentPushType],
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

    const selectExecutionStats = {
      notNotifiedAppointments: appointments.length,
      users: userIds.length,
      totalPushTokens: tokens.length,
      recentUserTokens: Object.keys(recentUserToken).length,
      pushesToSend: pushMessages.length,
    }

    return {
      selectExecutionStats,
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

    const sendExecutionStats: SendExecutionStats = {
      push: {
        successCount: 0,
        failureCount: 0,
      },
      db: {
        scheduledPushesToSendRemovedSuccess: 0,
      },
    }

    for (const messageChunkKey in chunks) {
      const messageChunk = chunks[messageChunkKey]
      // Send chunk of pushes via FCM
      const pushResult = await sendBulkPushByToken(messageChunk)
      const batchAppointments: DbBatchAppointments[] = pushResult.responses.map((el, index) => ({
        appointmentId: messageChunk[index].data.appointmentId,
        scheduledAppointmentType: Number(messageChunk[index].data.scheduledAppointmentType),
      }))
      sendExecutionStats.push.successCount += pushResult.successCount
      sendExecutionStats.push.failureCount += pushResult.failureCount

      // Save execution in data
      const dbResult = await this.appointmentService.removeBatchScheduledPushesToSend(
        batchAppointments,
      )
      if (dbResult) {
        sendExecutionStats.db.scheduledPushesToSendRemovedSuccess += batchAppointments.length
      }
    }

    return sendExecutionStats
  }

  /**
   * Sends a push to the user by userId and type of message
   */
  async sendPushByUserId(
    userId: string,
    messageType: ReservationPushTypes,
    data?: {[key: string]: string},
  ): Promise<unknown> {
    const tokens = await this.registrationService.findForUserIds([userId])
    const recentUserToken = this.getRecentUsersToken(tokens)

    const message: PushMessages = {
      token: recentUserToken[userId],
      notification: {
        title: this.messageTitle[messageType],
        body: this.messagesBody[messageType](null, null),
      },
      data,
    }

    const pushResult = await sendBulkPushByToken([message])
    return pushResult
  }
}
