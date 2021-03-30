// import {dateFormats, timeFormats} from '../../../common/src'
import {sendBulkMessage, PushMessages} from '../../../common/src/service/messaging/push-notify-service'

export enum AppointmentPushTypes {
  before24hours,
  before3hours,
  ready,
  reSample,
}

/**
 * TODO:
 * 1. Message title
 */
export class AppointmentPushService {
  messagesBody: {[index: number]: Function} = {
    [AppointmentPushTypes.before24hours]: (dateTime, clinicName) =>
      `Copy: You have a Covid-19 test scheduled for ${dateTime} at our ${clinicName} location.`,
    [AppointmentPushTypes.before3hours]: (dateTime, clinicName) =>
      `Your Covid-19 test is scheduled for today at ${dateTime} at our ${clinicName} location.`,
    [AppointmentPushTypes.ready]: () => `Your Covid-19 test result is ready. Tap here to view.`,
    [AppointmentPushTypes.reSample]: () =>
      `We need another sample to complete your Covid-19 test. Please book another appointment.`,
  }

  sendPush(messageType: AppointmentPushTypes, dateTime?: string, clinicName?: string) {
    const title = 'Test title'
    const body = this.messagesBody[messageType](dateTime, clinicName)

  }
}
