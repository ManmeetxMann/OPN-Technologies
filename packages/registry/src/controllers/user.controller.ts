import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {Registration, RegistrationTypes} from '../models/registration'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {MessagingFactory} from '../../../common/src/service/messaging/messaging-service'
import {RegistrationService} from '../service/registration-service'

class UserController implements IControllerBase {
  public path = '/user'
  public router = express.Router()
  private registrationService = new RegistrationService()
  private messaging = MessagingFactory.getDefault()

  constructor() {
    this.initRoutes()
  }

  public initRoutes() {
    this.router.post(this.path + '/add', this.add)
  }

  add = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check token
      const {platform, osVersion, pushToken} = req.body as Registration
      if (pushToken) {
        await this.messaging.validatePushToken(pushToken)
      }

      // Save token
      const registration = await this.registrationService.create({
        type: RegistrationTypes.User,
        platform,
        osVersion,
        pushToken: pushToken ?? null,
      } as Registration)

      res.json(actionSucceed(registration))
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
