import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
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

  update = async (req: Request, res: Response) => {
    // Very primitive and temporary solution that assumes 4 boolean answers in the same given order
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

    const passport = await this.passportService.create(passportStatus)
    return res.json(actionSucceed(passport))
  }
}

export default UserController
