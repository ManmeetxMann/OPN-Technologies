import admin from 'firebase-admin'
import * as _ from 'lodash'
export const sendMessage = (
  title: string,
  body: string,
  imageUrl: string,
  tokens: string[],
): Promise<unknown> => {
  const messages = tokens.map(
    (token: string): admin.messaging.Message => ({
      token,
      notification: {
        title,
        body,
        imageUrl,
      },
    }),
  )
  const chunks = _.chunk(messages, 500)
  if (!chunks.length) {
    console.log('no tokens were provided for message', title, body)
    return
  }
  console.log('sending push notification', title, body)
  if (tokens.length < 10) {
    console.log('to tokens', tokens)
  } else {
    console.log(`to ${tokens.length} tokens`)
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
