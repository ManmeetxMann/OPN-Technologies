// import {dateFormats, timeFormats} from '../../../common/src'
import {
  sendBulkMessagesByToken,
  PushMessages,
} from '../../../common/src/service/messaging/push-notify-service'
import {PushMeta, AppointmentPushTypes} from '../types/appointment-push'

/**
 * TODO:
 * 1. Message title
 */
export class AppointmentPushService {
  private messagesBody: {[index: number]: Function} = {
    [AppointmentPushTypes.before24hours]: (dateTime, clinicName) =>
      `Copy: You have a Covid-19 test scheduled for ${dateTime} at our ${clinicName} location.`,
    [AppointmentPushTypes.before3hours]: (dateTime, clinicName) =>
      `Your Covid-19 test is scheduled for today at ${dateTime} at our ${clinicName} location.`,
    [AppointmentPushTypes.ready]: () => `Your Covid-19 test result is ready. Tap here to view.`,
    [AppointmentPushTypes.reSample]: () =>
      `We need another sample to complete your Covid-19 test. Please book another appointment.`,
  }
  private messagesQueue: PushMessages[] = []

  addPushToQueue(messageType: AppointmentPushTypes, pushMeta?: PushMeta) {
    const title = 'Test title'
    const body = this.messagesBody[messageType](pushMeta?.dateTime, pushMeta?.clinicName)
    this.messagesQueue.push({
        recipientToken: pushMeta?.recipientToken,
        title,
        body
    })
  }

  async sendQueue() {
    await sendBulkMessagesByToken(this.messagesQueue)
  }
}
