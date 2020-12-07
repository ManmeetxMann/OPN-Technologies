import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import * as express from 'express'
import {Handler, Router} from 'express'
import {authMiddleware} from '../../../../common/src/middlewares/auth'
import {OrganizationService} from '../../services/organization-service'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {OrganizationGroup} from '../../models/organization'

const organizationService = new OrganizationService()

/**
 * Search a user(s) profile and returns a User(s)
 */
const getUsersByGroupId: Handler = async (req, res, next): Promise<void> => {
  try {
    const {organizationId, groupId} = req.params as {organizationId: string; groupId: string}
    const users = await organizationService.getUsersGroups(organizationId, groupId)

    res.json(actionSucceed(users))
  } catch (error) {
    next(error)
  }
}

const updateGroup: Handler = async (req, res, next): Promise<void> => {
  try {
    const {organizationId, groupId} = req.params as {organizationId: string; groupId: string}
    const groupData = req.body as OrganizationGroup;
    const updatedGroup = await organizationService.updateGroup(organizationId, groupId, groupData)

    res.json(actionSucceed(updatedGroup))
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
      innerRouter()
        .get('/groups/:groupId/users', authMiddleware, getUsersByGroupId)
        .put('/groups/:groupId', authMiddleware, updateGroup),
    )

    this.router.use(root, authentication, authentication)
  }
}

export default GroupController
