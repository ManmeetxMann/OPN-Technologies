import {MessagingService} from './messaging-service'
import admin from 'firebase-admin'
import {FirebaseError, FirebaseMessagingErrors} from '../../types/firebase'
import {BadRequestException} from '../../exceptions/bad-request-exception'
import {HttpException} from '../../exceptions/httpexception'
import {LogError} from '../../utils/logging-setup'

type FirebaseSendParams = {
  dryRun: boolean
}

export class FirebaseMessagingService implements MessagingService<admin.messaging.Message> {
  public send(message: admin.messaging.Message, params?: FirebaseSendParams): Promise<unknown> {
    return admin.messaging().send(message, params?.dryRun)
  }

  public validatePushToken(token: string): Promise<unknown> {
    return this.send({token}, {dryRun: true}).catch((error: FirebaseError) => {
      console.log(`Something went wrong when validating token [${token}];`, error)
      if (
        error.code === FirebaseMessagingErrors.InvalidArgument ||
        error.code === FirebaseMessagingErrors.Unregistered ||
        error.code === FirebaseMessagingErrors.TokenNotRegistered
      ) {
        LogError('validatePushToken', 'InvalidArgumentORUnregistered', {
          errorMessage: error.message,
        })
        throw new BadRequestException(`Invalid token: ${error.message}`)
      }

      LogError('validatePushToken', 'ValidationFailed', {
        errorMessage: error.message,
      })
      throw new HttpException()
    })
  }
}
