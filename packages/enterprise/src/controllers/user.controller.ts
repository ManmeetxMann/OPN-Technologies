import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

import Validation from '../../../common/src/utils/validation'
import {OrganizationService} from '../services/organization-service'
import {OrganizationConnectionRequest} from '../models/organization-connection-request'
import {UserService} from '../../../common/src/service/user/user-service'
import {User} from '../../../common/src/data/user'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {Organization} from '../models/organization'

class UserController implements IControllerBase {
  public path = '/user'
  public router = express.Router()
  private organizationService = new OrganizationService()
  private userService = new UserService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/connect/add', this.connect)
    this.router.post(this.path + '/connect/remove', this.disconnect)
    this.router.post(this.path + '/connect/locations', this.connectedLocations)
  }

  // Note: Doesn't handle multiple organizations per user as well as checking an existing connection
  connect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // TODO Assert birthYear meets legal requirements

      // Fetch org by key
      const {
        key,
        firstName,
        lastNameInitial,
        birthYear,
        base64Photo,
      } = req.body as OrganizationConnectionRequest
      const organization = await this.organizationService.findOneByKey(key)

      // Create user
      const user = await this.userService.create({
        firstName,
        lastNameInitial,
        birthYear,
        base64Photo,
        organizationIds: [organization.id],
      } as User)

      res.json(actionSucceed({user, organization}))
    } catch (error) {
      next(error)
    }
  }

  disconnect = (req: Request, res: Response): void => {
    if (!Validation.validate(['key'], req, res)) {
      return
    }

    console.log(req.body.key)
    const response = {
      // data : {

      // },
      status: 'complete',
    }

    res.json(response)
  }

  connectedLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {userId} = req.body
      const user = await this.userService.findOne(userId)
      const organizations: Organization[] = await Promise.all(
        user.organizationIds
          .map((organizationId) => this.organizationService.findOneById(organizationId))
          .filter((org) => !!org),
      )
      res.json(actionSucceed(organizations))
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
