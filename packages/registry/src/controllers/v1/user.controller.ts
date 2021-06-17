import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {
  OpnSources,
  Registration,
  RegistrationUpdate,
} from '../../../../common/src/data/registration'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {MessagingFactory} from '../../../../common/src/service/messaging/messaging-service'
import {RegistrationService} from '../../../../common/src/service/registry/registration-service'

class UserController implements IControllerBase {
  public path = '/user'
  public router = express.Router()
  private registrationService = new RegistrationService()
  private messaging = MessagingFactory.getPushableMessagingService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/add', this.add)
    this.router.put(this.path + '/update', this.update)
  }

  add = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {platform, osVersion, pushToken} = req.body as Registration

      // Check token
      if (pushToken) {
        await this.messaging.validatePushToken(pushToken)
      }

      // Save token
      const registration = await this.registrationService.create({
        platform,
        osVersion,
        pushToken: pushToken ?? null,
        tokenSource: OpnSources.OPN_Android,
        userIds: [],
      })

      res.json(actionSucceed(registration))
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {registrationId, pushToken} = req.body as RegistrationUpdate

      // Check token
      await this.messaging.validatePushToken(pushToken)

      // Save token
      await this.registrationService.updateProperty(registrationId, 'pushToken', pushToken)

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
