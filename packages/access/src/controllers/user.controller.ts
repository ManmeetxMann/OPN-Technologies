import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

import Validation from '../../../common/src/utils/validation'
import {PassportService} from '../../../passport/src/services/passport-service'
import {PassportStatuses} from '../../../passport/src/models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {AccessService} from '../service/access.service'
import {actionFailed, actionSucceed} from '../../../common/src/utils/response-wrapper'

class UserController implements IControllerBase {
  private router = express.Router()
  private passportService = new PassportService()
  private accessService = new AccessService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes() {
    const routes = express
      .Router()
      .post('/createToken', this.createToken)
      .post('/exposure/verify', this.exposureVerification)
    this.router.use('/user', routes)
  }

  createToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {statusToken, locationId} = req.body
      const access = await this.passportService
        .findOneByToken(statusToken)
        .then((passport) =>
          passport.status === PassportStatuses.Proceed && !isPassed(passport.validUntil)
            ? this.accessService.create(statusToken, locationId)
            : null,
        )
      const response = access
        ? actionSucceed(access)
        : actionFailed('Access denied: Cannot grant access for the given status-token')

      res.status(access ? 200 : 403).json(response)
    } catch (error) {
      next(error)
    }
  }

  exposureVerification = (req: Request, res: Response) => {
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
