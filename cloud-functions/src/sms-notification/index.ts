/**
 * Background Cloud Function, triggered by Pub/Sub.
 * Sends SMS message using twilio client
 *
 * @param {object} message The Pub/Sub message.
 * @param {object} context The event metadata.
 */
import type {EventFunctionWithCallback} from '@google-cloud/functions-framework/build/src/functions'
import {Twilio} from 'twilio'

export const enum SMSMessageType {
  MessageTypeOne = 'MessageTypeOne',
  MessageTypeTwo = 'MessageTypeTwo',
}

interface PubSubMessage {
  data: string
  attributes: {
    toPhoneNumber: string
    messageType: SMSMessageType
  }
}

interface Context {
  eventId: string
  timestamp: string // String (ISO 8601)
  eventType: string
  resource: {} // The resource that emitted the event.
}

/**
 * TODO:
 * 1. Place actual values
 */
const messageText = {
  [SMSMessageType.MessageTypeOne]: 'Message type 1',
  [SMSMessageType.MessageTypeTwo]: 'Message type 2',
}

const getMessageFromType = (messageType: string): string => {
  if (!Object.keys(messageText).includes(messageType)) {
    return null
  }
  return messageText[messageType]
}

/**
 * Background cloud function
 * @param pubSubMessage
 * @param context
 * @param callback
 */
const smsNotification: EventFunctionWithCallback = (
  pubSubMessage: PubSubMessage,
  context: Context,
  callback,
) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const twilioFromNumber = process.env.TWILIO_FROM_PHONE_NUMBER

  // Validate if message type is valid
  const messageType = pubSubMessage.attributes.messageType
  const toPhoneNumber = pubSubMessage.attributes.toPhoneNumber
  const smsBody = getMessageFromType(messageType)
  if (!smsBody) {
    callback(new Error(`Not valid attribute messageType: ${messageType}`))
  }

  // Initiate twillio client and validate phone number format
  const client = new Twilio(accountSid, authToken)
  client.lookups.v1
    .phoneNumbers(toPhoneNumber)
    .fetch()
    .then(() => {
      // Send message
      client.messages
        .create({
          from: twilioFromNumber,
          to: toPhoneNumber,
          body: 'You just sent an SMS from TypeScript using Twilio!' + smsBody,
        })
        .then((message) => {
          callback(null, `Message sent: ${message.sid}`)
        })
        .catch((error) => {
          callback(new Error(error))
        })
    })
    .catch((error) => {
      callback(new Error(`Not valid phone number ${toPhoneNumber}`))
    })
}

export {smsNotification}
