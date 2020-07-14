import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

import Validation from '../../../common/src/utils/validation'
import {PassportService} from '../../../passport/src/services/passport-service'
import {AccessService} from '../service/access.service'
import {actionFailed, actionSucceed} from '../../../common/src/utils/response-wrapper'
import {PassportStatuses} from '../../../passport/src/models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'

class AdminController implements IControllerBase {
  private router = express.Router()
  private passportService = new PassportService()
  private accessService = new AccessService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes() {
    const routes = express
      .Router()
      .post('/stats', this.stats)
      .post('/enter', this.enter)
      .post('/exit', this.exit)
    this.router.use('/admin', routes)
  }

  stats = (req: Request, res: Response) => {
    if (!Validation.validate(['locationId'], req, res)) {
      return
    }

    console.log(req.body.locationId)
    const response = {
      data: {
        peopleOnPremises: 213,
        accessDenied: 8,
      },
      serverTimestamp: new Date().toISOString(),
      status: 'complete',
    }

    res.json(response)
  }

  enter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {accessToken, locationId} = req.body
      const access = await this.accessService.findOneByToken(accessToken)
      const passport = await this.passportService.findOneByToken(access.statusToken)

      if (passport.status === PassportStatuses.Proceed && !isPassed(passport.validUntil)) {
        await this.accessService.handleEnter(access, locationId)
        res.json(actionSucceed(passport))
      }

      res.status(400).json(actionFailed('Access denied for access-token', passport))
    } catch (error) {
      next(error)
    }
  }

  exit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {accessToken, locationId} = req.body
      const access = await this.accessService.findOneByToken(accessToken)
      const passport = await this.passportService.findOneByToken(access.statusToken)

      await this.accessService.handleExit(access, locationId)

      res.json(actionSucceed(passport))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController
