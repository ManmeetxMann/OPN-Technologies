import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {v4 as uuid} from 'uuid'

import Validation from '../../../common/src/utils/validation'
import {OrganizationService} from '../services/organization-service'
import {OrganizationConnectionRequest} from '../models/organization-connection-request'
import {UserService} from '../../../common/src/service/user/user-service'
import {User} from '../../../common/src/data/user'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'

class UserController implements IControllerBase {
  public path = '/user'
  public router = express.Router()
  private organizationService = new OrganizationService()
  private userService = new UserService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes() {
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

  disconnect = (req: Request, res: Response) => {
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

  connectedLocations = (req: Request, res: Response) => {
    if (!Validation.validate(['connectedToken'], req, res)) {
      return
    }

    console.log(req.body.connectedToken)
    const response = {
      data: {
        registeredLocations: [
          {
            id: uuid(),
            orgId: uuid(),
            title: 'Royal Ontario Museum',
            address: "100 Queen's Park",
            address2: 'Suite 403',
            city: 'Toronto',
            state: 'Ontario',
            zip: 'M7V 1P9',
            country: 'Canada',
            divisions: [
              {
                id: uuid(),
                title: 'Floor 1',
                address: "100 Queen's Park",
                address2: 'Suite 403',
                city: 'Toronto',
                state: 'Ontario',
                zip: 'M7V 1P9',
                country: 'Canada',
              },
              {
                id: uuid(),
                title: 'Floor 2',
                address: "100 Queen's Park",
                address2: 'Suite 403',
                city: 'Toronto',
                state: 'Ontario',
                zip: 'M7V 1P9',
                country: 'Canada',
              },
              {
                id: uuid(),
                title: 'Second Building',
                address: "95 Queen's Park",
                city: 'Toronto',
                state: 'Ontario',
                zip: 'M7V 1P9',
                country: 'Canada',
              },
            ],
          },
        ],
      },
      status: 'complete',
    }

    res.json(response)
  }
}

export default UserController
