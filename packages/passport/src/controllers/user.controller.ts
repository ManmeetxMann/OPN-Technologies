import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import {PubSub, Topic} from '@google-cloud/pubsub'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {PassportService} from '../services/passport-service'
import {PassportStatuses, Passport} from '../models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {Attestation, AttestationAnswers} from '../models/attestation'
import {AttestationService} from '../services/attestation-service'
import {AccessService} from '../../../access/src/service/access.service'
import {Config} from '../../../common/src/utils/config'
import {now} from '../../../common/src/utils/times'

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
        .then(() => {
          this.topic = pubsub.topic(Config.get('PUBSUB_TRACE_TOPIC'))
        })
    } catch (error) {
      if (error.code !== 6) throw error
    }
  }

  // TODO: actually test this against questionnaire "answer keys"
  private async evaluateAnswers(answers: AttestationAnswers): Promise<PassportStatuses> {
    // note that this switches us to 0-indexing
    const responses = [1, 2, 3, 4, 5, 6].map((index) => (answers[index] ? answers[index][1] : null))
    if (responses[4] !== null && responses[5] !== null) {
      // 6 response case
      if (responses.some((response) => response)) {
        return PassportStatuses.Stop
      }
      return PassportStatuses.Proceed
    }
    // 4 response case
    if (responses[1] || responses[2] || responses[3]) {
      return PassportStatuses.Stop
    }
    if (responses[0]) {
      return PassportStatuses.Caution
    }
    return PassportStatuses.Proceed
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
      const includeGuardian = req.body.includeGuardian ?? true
      if (!includeGuardian) {
        throw new Error('Guardian must be included in all passports')
      }
      const dependantIds: string[] = req.body.dependantIds ?? []
      const existingPassport = statusToken
        ? await this.passportService.findOneByToken(statusToken)
        : null
      let currentPassport: Passport
      if (existingPassport) {
        /*
                REMOVED (TEMPORARILY?) - THIS CALL JUST CHECKS IF A VALID PASSPORT EXISTS, DOESN'T CARE ABOUT DEPENDANTS

        // some requested dependants are not covered by this passport
        if (dependantIds.some((depId) => !existingPassport.dependantIds.includes(depId))) {
          // need to create a new one for different people
        } else
        */
        if (!isPassed(existingPassport.validUntil)) {
          // still valid, no need to recreate
          currentPassport = existingPassport
        } else if (existingPassport.status !== PassportStatuses.Proceed) {
          // only Proceed passports expire
          currentPassport = existingPassport
        }
      }
      if (!currentPassport) {
        currentPassport = await this.passportService.create(
          PassportStatuses.Pending,
          userId,
          dependantIds,
        )
      }
      res.json(actionSucceed(currentPassport))
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {locationId, userId} = req.body
      const includeGuardian = req.body.includeGuardian ?? true
      if (!includeGuardian) {
        throw new Error('Guardian must be included in all passports')
      }

      const dependantIds: string[] = req.body.dependantIds ?? []
      const answers: AttestationAnswers = req.body.answers
      const passportStatus = await this.evaluateAnswers(answers)

      const saved = await this.attestationService.save({
        answers,
        locationId,
        userId,
        status: passportStatus,
      } as Attestation)

      const passport = await this.passportService.create(passportStatus, userId, dependantIds)

      // Stats
      const count = dependantIds.length + 1
      await this.accessService.incrementTodayPassportStatusCount(locationId, passportStatus, count)
      // await this.accessService.incrementTodayPassportStatusCount(
      //   locationId,
      //   PassportStatuses.Pending,
      //   -count,
      // )
      if ([PassportStatuses.Caution, PassportStatuses.Stop].includes(passportStatus)) {
        if (userId) {
          const nowMillis = now().valueOf()
          this.topic.publish(Buffer.from('trace-required'), {
            userId,
            passportStatus,
            startTime: `${nowMillis - TRACE_LENGTH}`,
            endTime: `${nowMillis}`,
          })
        } else {
          console.warn(
            `Could not execute a trace of attestation ${saved.id} because userId was not provided`,
          )
        }
        await this.accessService.incrementAccessDenied(locationId, count)
      }

      res.json(actionSucceed(passport))
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
