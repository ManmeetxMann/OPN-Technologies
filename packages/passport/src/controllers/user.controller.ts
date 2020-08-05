import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import {PubSub, Topic} from '@google-cloud/pubsub'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {PassportService} from '../services/passport-service'
import {PassportStatuses} from '../models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {Attestation} from '../models/attestation'
import {AttestationService} from '../services/attestation-service'
import {AccessService} from '../../../access/src/service/access.service'
import {Config} from '../../../common/src/utils/config'

const TRACE_LENGTH = 48 * 60 * 60 * 1000

class UserController implements IControllerBase {
  public path = '/user'
  public router = express.Router()
  private passportService = new PassportService()
  private attestationService = new AttestationService()
  private accessService = new AccessService()
  private topic: Topic
  constructor() {
    this.initRoutes()
    try {
      const pubsub = new PubSub()
      pubsub
        .createTopic(Config.get('PUBSUB_TRACE_TOPIC'))
        .catch((err) => {
          if (err.code !== 6) {
            throw err
          }
        })
        .then(() => (this.topic = pubsub.topic(Config.get('PUBSUB_TRACE_TOPIC'))))
    } catch (error) {
      if (error.code !== 6) throw error
    }
  }

  public initRoutes(): void {
    this.router.post(this.path + '/status/get', this.check)
    this.router.post(this.path + '/status/update', this.update)
  }

  check = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Fetch passport status token
      // or create a pending one if any
      const {statusToken, userId} = req.body
      if (!userId) {
        console.warn('Not including userId is deprecated and will be removed')
      }

      const existingPassport = statusToken
        ? await this.passportService.findOneByToken(statusToken)
        : null
      if (existingPassport && userId && existingPassport.userId !== userId) {
        console.error(`${userId} tried to check ${existingPassport.userId}'s passport`)
        throw new Error('That passport belongs to another user')
      }
      const newPassport = existingPassport
        ? existingPassport.status === PassportStatuses.Proceed &&
          isPassed(existingPassport.validUntil)
          ? await this.passportService.create(
              PassportStatuses.Pending,
              existingPassport.userId || userId,
            )
          : existingPassport
        : await this.passportService.create(PassportStatuses.Pending, userId)

      res.json(actionSucceed(newPassport))
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Very primitive and temporary solution that assumes 4 boolean answers in the same given order
    try {
      const {locationId, userId} = req.body

      if (!userId) {
        console.warn('Not including userId is deprecated and will be removed')
      }

      const answers: Record<number, Record<number, boolean>> = req.body.answers
      const a1 = answers[1][1]
      const a2 = answers[2][1]
      const a3 = answers[3][1]
      const a4 = answers[4][1]

      const passportStatus =
        a2 || a3 || a4
          ? PassportStatuses.Stop
          : a1
          ? PassportStatuses.Caution
          : PassportStatuses.Proceed

      const saved = await this.attestationService.save({
        answers,
        locationId,
        userId,
        status: passportStatus,
      } as Attestation)

      if ([PassportStatuses.Caution, PassportStatuses.Stop].includes(passportStatus)) {
        await this.accessService.incrementAccessDenied(locationId)
        if (userId) {
          const nowMillis = new Date().valueOf()
          this.topic.publish(Buffer.from('trace-required'), {
            userId,
            severity: passportStatus,
            startTime: `${nowMillis - TRACE_LENGTH}`,
            endTime: `${nowMillis}`,
          })
        } else {
          console.warn(
            `Could not execute a trace of attestation ${saved.id} because userId was not provided`,
          )
        }
      }

      const passport = await this.passportService.create(passportStatus, userId)
      res.json(actionSucceed(passport))
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
