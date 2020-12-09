import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import * as express from 'express'
import {Handler, Router} from 'express'
import {authMiddleware} from '../../../../common/src/middlewares/auth'
import {OrganizationService} from '../../services/organization-service'
import {UserService} from '../../services/user-service'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {OrganizationGroup} from '../../models/organization'
import {User, userDTOResponse} from '../../models/user'
import {PageableRequestFilter} from '../../../../common/src/types/request'

const organizationService = new OrganizationService()
const userService = new UserService()

/**
 * Search a user(s) profile and returns a User(s)
 */
const getUsersByGroupId: Handler = async (req, res, next): Promise<void> => {
  try {
    const {perPage, page} = req.query as PageableRequestFilter
    const {organizationId, groupId} = req.params as {organizationId: string; groupId: string}

    const userIds = await organizationService.getUsersByGroup(
      organizationId,
      groupId,
      page,
      perPage,
    )

    const users = await userService.getAllByIds(userIds.map((user) => user.userId))
    res.json(
      actionSucceed(
        users.map((user: User) => {
          return {
            ...userDTOResponse(user),
            createdAt:
              user.timestamps && user.timestamps.createdAt
                ? user.timestamps.createdAt.toDate().toISOString()
                : null,
            updatedAt:
              user.timestamps && user.timestamps.updatedAt
                ? user.timestamps.updatedAt.toDate().toISOString()
                : null,
          }
        }),
      ),
    )
  } catch (error) {
    next(error)
  }
}

const updateGroup: Handler = async (req, res, next): Promise<void> => {
  try {
    const {organizationId, groupId} = req.params as {organizationId: string; groupId: string}
    const groupData = req.body as OrganizationGroup
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
