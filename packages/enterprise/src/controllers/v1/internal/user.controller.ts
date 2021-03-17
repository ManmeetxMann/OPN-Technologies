import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import * as express from 'express'
import {UserService} from '../../../../../common/src/service/user/user-service'
import {NextFunction, Request, Response} from 'express'
import {WebhookUserCreateRequest} from '../../../models/user'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {Config} from '../../../../../common/src/utils/config'
import {OrganizationService} from '../../../services/organization-service'

class UserController implements IControllerBase {
  public path = '/enterprise/internal/api/v1/user'
  public router = express.Router()
  private userService = new UserService()
  private organizationService = new OrganizationService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/', this.findOrCreateUser)
  }

  findOrCreateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {email, firstName, lastName, organizationId} = req.body as WebhookUserCreateRequest

      let user = await this.userService.findOneByEmail(email)

      if (!user) {
        const defaultOrgId = Config.get('DEFAULT_ORG_ID')
        const defaultGroupId = Config.get('DEFAULT_GROUP_ID')

        user = await this.userService.create({
          firstName,
          lastName,
          email,
          admin: null,
          authUserId: null,
          base64Photo: null,
          registrationId: null,
          delegates: [],
          organizationIds: [defaultOrgId, organizationId],
        })

        // add user in default group
        await this.organizationService.addUserToGroup(defaultOrgId, defaultGroupId, user.id)
      }

      res.json(actionSucceed(user))
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
