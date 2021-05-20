/**
 * Background Cloud Function, triggered by Pub/Sub.
 * Sends SMS message using twilio client
 *
 * @param {object} message The Pub/Sub message.
 * @param {object} context The event metadata.
 */
import type {EventFunctionWithCallback} from '@google-cloud/functions-framework/build/src/functions'
import {Twilio} from 'twilio'

interface PubSubMessage {
  data: string
  attributes: {
    userId: string
    organizationId: string
    actionType: string
    phone: string
    firstName: string
  }
}

interface Context {
  eventId: string
  timestamp: string // String (ISO 8601)
  eventType: string
  resource: {} // The resource that emitted the event.
}

const getMessageBody = (pubSubMessage: PubSubMessage): string => {
  return `Hi ${pubSubMessage.attributes.firstName},
The results from your Covid-19 test with FH Health have been sent to the email address on file. 
If you did not receive your test results, please email info@fhhealth.ca and we can resend it to you.
Thank you,
FH Health`
}

const getPhoneNumber = (pubSubMessage: PubSubMessage): string => {
  return `+1${pubSubMessage.attributes.phone}`
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
  if (!pubSubMessage.attributes.firstName || !pubSubMessage.attributes.phone) {
    callback(
      new Error(
        `Not valid attribute firstName or phone: ${JSON.stringify(pubSubMessage.attributes)}`,
      ),
    )
  }
  const smsBody = getMessageBody(pubSubMessage)
  const toPhoneNumber = getPhoneNumber(pubSubMessage)

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
          body: smsBody,
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
