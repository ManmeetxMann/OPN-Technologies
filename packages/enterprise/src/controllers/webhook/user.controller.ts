import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import * as express from 'express'
import {UserService} from '../../../../common/src/service/user/user-service'
import {NextFunction, Request, Response} from 'express'
import {WebhookUserCreateRequest} from '../../models/user'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'

class UserController implements IControllerBase {
  public path = '/webhook/user'
  public router = express.Router()
  private userService = new UserService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/create', this.findOrCreateUser)
  }

  findOrCreateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {email, firstName, lastName, organizationId} = req.body as WebhookUserCreateRequest

      let user = await this.userService.findOneByEmail(email)

      if (!user) {
        user = await this.userService.create({
          firstName,
          lastName,
          email,
          admin: null,
          authUserId: null,
          base64Photo: null,
          registrationId: null,
          delegates: [],
          organizationIds: [organizationId],
        })
      }

      res.json(actionSucceed(user))
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
