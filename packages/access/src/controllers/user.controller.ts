import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IRouteController from '../../../common/src/interfaces/IRouteController.interface'

import Validation from '../../../common/src/utils/validation'
import {PassportService} from '../../../passport/src/services/passport-service'
import {PassportStatuses} from '../../../passport/src/models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {AccessService} from '../service/access.service'
import {actionFailed, actionSucceed} from '../../../common/src/utils/response-wrapper'
import {Config} from '../../../common/src/utils/config'

// disables the `includeGuardian` parameter. guardians are never included with dependants
// and always included otherwise
const includeGuardianHack = Config.get('FEATURE_AUTOMATIC_INCLUDE_GUARDIAN') === 'enabled'

class UserController implements IRouteController {
  public router = express.Router()
  private passportService = new PassportService()
  private accessService = new AccessService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const routes = express
      .Router()
      .post('/createToken', this.createToken)
      .post('/exposure/verify', this.exposureVerification)
    this.router.use('/user', routes)
  }

  createToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {statusToken, locationId, userId} = req.body
      const dependantIds: string[] = req.body.dependantIds ?? []
      const includeGuardian = includeGuardianHack
        ? !dependantIds.length
        : req.body.includeGuardian ?? true
      const passport = await this.passportService.findOneByToken(statusToken)

      const fail = (reason: string) => res.status(403).json(actionFailed(reason))

      if (!passport) {
        fail('Access denied: status-token does not link to a passport')
        return
      }

      if (passport.userId !== userId) {
        // TODO: we could remove userId from this call
        fail(`Access denied: passport does not belong to ${userId}`)
        return
      }
      if (
        !(
          passport.status === PassportStatuses.Pending ||
          (passport.status === PassportStatuses.Proceed && !isPassed(passport.validUntil))
        )
      ) {
        fail('Access denied: this passport does not permit entry')
        return
      }
      if (
        dependantIds.length &&
        dependantIds.some((depId) => !passport.dependantIds.includes(depId))
      ) {
        fail('Access denied: this passport does not apply to all dependants')
        return
      }
      const access = await this.accessService.create(
        statusToken,
        locationId,
        userId,
        includeGuardian,
        dependantIds,
      )

      const response = access
        ? actionSucceed(access)
        : actionFailed('Access denied: Cannot grant access for the given status-token')

      res.status(access ? 200 : 403).json(response)
    } catch (error) {
      next(error)
    }
  }

  exposureVerification = (req: Request, res: Response): void => {
    if (!Validation.validate(['accessToken', 'locationId'], req, res)) {
      return
    }

    console.log(req.body.accessToken)
    const response = {
      data: {
        exposed: false,
      },
      serverTimestamp: new Date().toISOString(),
      status: 'complete',
    }

    res.json(response)
  }
}

export default UserController
