import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import {PubSub, Topic} from '@google-cloud/pubsub'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {PassportService} from '../services/passport-service'
import {Passport, PassportStatuses} from '../models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {Attestation, AttestationAnswers} from '../models/attestation'
import {AttestationService} from '../services/attestation-service'
import {AccessService} from '../../../access/src/service/access.service'
import {Config} from '../../../common/src/utils/config'
import {now} from '../../../common/src/utils/times'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'

const TRACE_LENGTH = 48 * 60 * 60 * 1000

class UserController implements IControllerBase {
  public path = '/user'
  public router = express.Router()
  private passportService = new PassportService()
  private attestationService = new AttestationService()
  private accessService = new AccessService()
  private organizationService = new OrganizationService()
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
    const questionCount = responses[4] !== null && responses[5] !== null ? 6 : 4
    const [values, caution, stop] = {
      4: [[1, 1, 1, 2], 1, 2],
      6: [[1, 1, 1, 1, 1, 1], 100, 1],
    }[questionCount]
    const score = (values as number[])
      .map((value: number, index: number) => (responses[index] ? value : 0))
      .reduce((total, current) => total + current)
    if (score >= stop) {
      return PassportStatuses.Stop
    }
    if (score >= caution) {
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
      const {statusToken, userId, includeGuardian} = req.body
      const dependantIds: string[] = req.body.dependantIds ?? []
      if (!includeGuardian && dependantIds.length === 0) {
        throw new BadRequestException('Must specify at least one user (guardian and/or dependant)')
      }

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
          includeGuardian,
        )
      }
      res.json(actionSucceed(currentPassport))
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {locationId, userId, includeGuardian} = req.body
      const {organizationId, questionnaireId} = await this.organizationService.getLocationById(
        locationId,
      )
      const dependantIds: string[] = req.body.dependantIds ?? []
      if (!includeGuardian && dependantIds.length === 0) {
        throw new BadRequestException('Must specify at least one user (guardian and/or dependant)')
      }
      const answers: AttestationAnswers = req.body.answers
      const passportStatus = await this.evaluateAnswers(answers)

      const saved = await this.attestationService.save({
        answers,
        locationId,
        userId,
        status: passportStatus,
      } as Attestation)

      const passport = await this.passportService.create(
        passportStatus,
        userId,
        dependantIds,
        includeGuardian,
      )

      // Stats
      const count = dependantIds.length + (includeGuardian ? 1 : 0)
      await this.accessService.incrementTodayPassportStatusCount(locationId, passportStatus, count)
      if ([PassportStatuses.Caution, PassportStatuses.Stop].includes(passportStatus)) {
        if (userId) {
          const nowMillis = now().valueOf()
          this.topic.publish(Buffer.from('trace-required'), {
            userId,
            passportStatus,
            startTime: `${nowMillis - TRACE_LENGTH}`,
            endTime: `${nowMillis}`,
            organizationId,
            locationId,
            questionnaireId,
            answers: JSON.stringify(answers),
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
