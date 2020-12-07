import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import * as express from 'express'
import {Handler, Router} from 'express'
import {authMiddleware} from '../../../../common/src/middlewares/auth'
import {OrganizationService} from '../../services/organization-service'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'

const organizationService = new OrganizationService()

/**
 * Search a user(s) profile and returns a User(s)
 */
const getUsersByGroupId: Handler = async (req, res, next): Promise<void> => {
  try {
    const {organizationId, groupId} = req.params as {organizationId: string; groupId: string}
    const users = organizationService.getUsersGroups(organizationId, groupId, [])

    res.json(actionSucceed(users))
  } catch (error) {
    next(error)
  }
}

class GroupController implements IControllerBase {
  public router = express.Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = () => Router({mergeParams: true})
    const root = `/enterprise/admin/api/v1/organizations/:organizationId`

    const authentication = innerRouter().use(
      '/',
      innerRouter().get('/groups/:groupId/users', authMiddleware, getUsersByGroupId),
    )

    this.router.use(root, authentication, authentication)
  }
}

export default GroupController
