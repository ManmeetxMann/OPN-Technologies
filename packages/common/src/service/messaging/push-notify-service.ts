import admin from 'firebase-admin'
import * as _ from 'lodash'

import {PushMessages} from '../../types/push-notification'

type Recipient = {
  token: string
  data?: Record<string, string | null | undefined>
}

export const sendMessage = (
  title: string,
  body: string,
  imageUrl: string,
  recipients: Recipient[],
): Promise<unknown> => {
  const messages = recipients.map(
    ({token, data}): admin.messaging.Message => ({
      token,
      data: Object.keys(data).reduce(
        // filter out nulls and empty strings
        (result, key) => (typeof data[key] === 'string' ? {...result, [key]: data[key]} : result),
        {},
      ),
      notification: {
        title,
        body,
        imageUrl,
      },
    }),
  )
  const chunks: admin.messaging.Message[][] = _.chunk(messages, 500)
  if (!chunks.length) {
    console.log('no tokens were provided for message', title, body)
    return
  }
  console.log('sending push notification', title, body)
  if (recipients.length < 10) {
    console.log(
      'to tokens',
      recipients.map(({token}) => token),
    )
  } else {
    console.log(`to ${recipients.length} tokens`)
  }
  const messaging = admin.messaging()
  chunks.forEach((chunk) =>
    messaging.sendAll(chunk).then((result) => {
      if (result.failureCount) {
        console.error(`${result.failureCount} messages failed`)
        const failures = result.responses.filter((response) => response.error)
        console.error(failures.map((failed) => `${failed.messageId}: ${failed.error.toJSON()}`))
      }
    }),
  )
}

export const sendBulkMessagesByToken = (pushMessages: PushMessages[]): Promise<unknown> => {
  return null
}
