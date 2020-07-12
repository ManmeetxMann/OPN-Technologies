import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {v4 as uuid} from 'uuid'

import Validation from '../../../common/src/utils/validation'
import {PassportService} from '../services/passport-service'
import {PassportStatuses} from '../models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'

class UserController implements IControllerBase {
  public path = '/user'
  public router = express.Router()
  private passportService = new PassportService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes() {
    this.router.post(this.path + '/status/get', this.check)
    this.router.post(this.path + '/status/update', this.update)
  }

  check = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Fetch passport status token
      // or create a pending one if any
      const {statusToken} = req.body
      const passport = await (statusToken
        ? this.passportService.findOneByToken(statusToken).then((target) =>
            // Reset proceed passport if expired
            target.status === PassportStatuses.Proceed && isPassed(target.validUntil)
              ? this.passportService.create()
              : target,
          )
        : this.passportService.create())

      res.json(actionSucceed(passport))
    } catch (error) {
      next(error)
    }
  }

  update = (req: Request, res: Response) => {
    if (!Validation.validate(['locationId', 'statusToken', 'answer'], req, res)) {
      return
    }

    console.log(req.body.locationId)
    console.log(req.body.answer)

    const date = new Date()
    const response = {
      data: {
        attestationToken: uuid(),
        passport: {
          updated: true,
          statusToken: uuid(),
          badge: 'proceed',
          validFrom: date.toISOString(),
          validUntil: new Date(date.getTime() + 60 * 60 * 24 * 1000).toISOString(),
        },
      },
      serverTimestamp: new Date().toISOString(),
      status: 'complete',
    }

    res.json(response)
  }
}

export default UserController
