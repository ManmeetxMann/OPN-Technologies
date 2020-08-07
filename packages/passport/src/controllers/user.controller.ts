import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {PassportService} from '../services/passport-service'
import {PassportStatuses, Passport} from '../models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {Attestation} from '../models/attestation'
import {AttestationService} from '../services/attestation-service'
import {AccessService} from '../../../access/src/service/access.service'

class UserController implements IControllerBase {
  public path = '/user'
  public router = express.Router()
  private passportService = new PassportService()
  private attestationService = new AttestationService()
  private accessService = new AccessService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/status/get', this.check)
    this.router.post(this.path + '/status/update', this.update)
  }

  check = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // TODO: how to handle dependents here?
    try {
      // Fetch passport status token
      // or create a pending one if any
      const {statusToken} = req.body
      const existingPassport = statusToken
        ? await this.passportService.findOneByToken(statusToken)
        : null
      let currentPassport: Passport
      if (existingPassport) {
        if (!isPassed(existingPassport.validUntil)) {
          currentPassport = existingPassport
        } else if (existingPassport.status !== PassportStatuses.Proceed) {
          currentPassport = existingPassport
        }
      }
      if (!currentPassport) {
        currentPassport = await this.passportService.create()
      }
      res.json(actionSucceed(currentPassport))
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Very primitive and temporary solution that assumes 4 boolean answers in the same given order
      const locationId = req.body.locationId
      const includeGuardian = req.body.includeGuardian ?? true
      const dependentIds = req.body.dependentIds ?? []

      if (!includeGuardian && dependentIds.length === 0) {
        throw new Error('attestation must be for at least one person')
      }

      // TODO: check that they're the real guardian

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

      await this.attestationService.save({
        answers,
        locationId,
        status: passportStatus,
      } as Attestation)

      if ([PassportStatuses.Caution, PassportStatuses.Stop].includes(passportStatus)) {
        await this.accessService.incrementAccessDenied(locationId)
      }

      const passport = await this.passportService.create(passportStatus)
      res.json(actionSucceed(passport))
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
