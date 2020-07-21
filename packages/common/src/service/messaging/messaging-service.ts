import {FirebaseMessagingService} from './firebase-messaging-service'

export interface MessagingService<T> {
  /**
   * Send a message of a type given by the messenger (eg. Firebase)
   * @param message the message payload
   * @param params the optional records of parameters
   */
  send(message: T, params?: Record<string, unknown>): Promise<unknown>

  /**
   * Check whether a push-notification token is valid
   * @param token
   */
  validatePushToken(token: string): Promise<unknown>
}

export class MessagingFactory {
  /**
   * Returns the default implementation of the MessagingService
   */
  static getDefault(): FirebaseMessagingService {
    return new FirebaseMessagingService()
  }
}
