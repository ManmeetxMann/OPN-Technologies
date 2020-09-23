import admin from 'firebase-admin'

export const sendMessage = (title: string, body: string, tokens: string[]): Promise<unknown> => {
  return admin.messaging().sendAll(
    tokens.map(
      (token: string): admin.messaging.Message => ({
        token,
        notification: {
          title,
          body,
        },
      }),
    ),
  )
}
