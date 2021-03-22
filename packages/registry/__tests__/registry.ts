import {app as server} from '../src/server'
import request from 'supertest'
import {actionFailed, actionSucceed, of} from '../../common/src/utils/response-wrapper'
import {ResponseStatusCodes} from '../../common/src/types/response-status'
import {FirebaseError, FirebaseMessagingErrors} from '../../common/src/types/firebase'
import {FirebaseMessagingService} from '../../common/src/service/messaging/firebase-messaging-service'

describe('UserController', () => {
  describe('Function: add', () => {
    const url = '/user/add'
    const registrationToken = 'a-registration-token'
    const spy = jest.spyOn(FirebaseMessagingService.prototype, 'send')

    it('should return validation_error when registrationToken is blank', () => {
      return request(server.app)
        .post(url)
        .send({})
        .expect(
          400,
          of(
            null,
            ResponseStatusCodes.ValidationError,
            "Error while validating request: request.body should have required property 'registrationToken'",
          ),
        )
    })

    // TODO: to be fixed
    xit('should return invalid token error', () => {
      const error: FirebaseError = {
        code: FirebaseMessagingErrors.InvalidArgument,
        message: 'Invalid token: The registration token is not a valid FCM registration token',
      }
      spy.mockRejectedValueOnce(error)
      return request(server.app)
        .post(url)
        .send({registrationToken})
        .expect(400, actionFailed(error.message))
    })

    it('should successfully register token and returns action succeed', () => {
      spy.mockResolvedValue('messageId')
      return request(server.app).post(url).send({registrationToken}).expect(200, actionSucceed())
    })
  })
})
