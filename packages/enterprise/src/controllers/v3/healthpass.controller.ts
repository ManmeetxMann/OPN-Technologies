import * as express from 'express'
import {Handler, Router} from 'express'

import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {UserService} from '../../../../common/src/service/user/user-service'
import {User} from '../../../../common/src/data/user'

import {HealthpassService} from '../../services/healthpass-service'
import {OrganizationService} from '../../services/organization-service'
import {
  organizationGroupDTOResponse,
  organizationSummaryDTOResponse,
} from '../../models/organization'
import {userDTO} from '../../../../common/src/data/user'

class RecommendationController implements IControllerBase {
  public router = express.Router()
  private passService = new HealthpassService()
  private userService = new UserService()
  private orgService = new OrganizationService()
  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = () => Router({mergeParams: true})
    const root = '/enterprise/api/v3/health-pass'
    const auth = authorizationMiddleware([RequiredUserPermission.RegUser], true)
    const route = innerRouter().use('/', innerRouter().get('/', auth, this.getHealthPass))
    this.router.use(root, route)
  }

  getHealthPass: Handler = async (req, res, next): Promise<void> => {
    try {
      const {organizationId, authenticatedUser} = res.locals
      const orgPromise = this.orgService.getByIdOrThrow(organizationId)
      const allDependants = await this.userService.getAllDependants(authenticatedUser.id, true)
      const allUsers: User[] = [authenticatedUser, ...allDependants]
      const passes = await Promise.all(
        allUsers.map(async (user) => {
          const [pass, group] = await Promise.all([
            this.passService.getHealthPass(user.id, organizationId as string),
            this.orgService.getUserGroup(organizationId as string, user.id),
          ])
          return {
            user: userDTO(user),
            group: organizationGroupDTOResponse(group),
            ...pass,
            dateOfBirth: pass.expiry ?? null, // TODO: Stub
          }
        }),
      )
      const organization = await orgPromise
      const response = {
        organization: organizationSummaryDTOResponse([organization])[0],
        passes,
      }
      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }
}

export default RecommendationController
