import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import {PubSub, Topic} from '@google-cloud/pubsub'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {PassportService} from '../services/passport-service'
import {PassportStatuses, Passport} from '../models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {Attestation} from '../models/attestation'
import {AttestationService} from '../services/attestation-service'
import {AccessService} from '../../../access/src/service/access.service'
import {Config} from '../../../common/src/utils/config'
import {now} from '../../../common/src/utils/times'

const TRACE_LENGTH = 48 * 60 * 60 * 1000

import DataStore from '../../../common/src/data/datastore'

class UserController implements IControllerBase {
  public path = '/user'
  public router = express.Router()
  private passportService = new PassportService()
  private attestationService = new AttestationService()
  private accessService = new AccessService()
  private topic: Topic
  private datastore = new DataStore()

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
    // Very primitive and temporary solution that assumes 4 boolean answers in the same given order
    try {
      // Very primitive and temporary solution that assumes 4 boolean answers in the same given order
      const {locationId, userId} = req.body
      const includeGuardian = req.body.includeGuardian ?? true
      if (!includeGuardian) {
        throw new Error('Guardian must be included in all passports')
      }

      const dependantIds: string[] = req.body.dependantIds ?? []

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
        if (userId) {
          const nowMillis = now().valueOf()
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
        const count = dependantIds.length + 1
        await this.accessService.incrementAccessDenied(locationId, count)
      }

      const passport = await this.passportService.create(passportStatus, userId, dependantIds)
      res.json(actionSucceed(passport))
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
