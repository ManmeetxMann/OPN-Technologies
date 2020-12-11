import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import * as express from 'express'
import {Handler, Router} from 'express'
import {authMiddleware} from '../../../../common/src/middlewares/auth'
import {OrganizationService} from '../../services/organization-service'
import {UserService} from '../../services/user-service'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {OrganizationGroup, organizationGroupDTOResponse} from '../../models/organization'
import {User, userDTOResponse} from '../../models/user'
import {CursoredRequestFilter} from '../../../../common/src/types/request'

const organizationService = new OrganizationService()
const userService = new UserService()

/**
 * Search a user(s) profile and returns a User(s)
 */
const getUsersByGroupId: Handler = async (req, res, next): Promise<void> => {
  try {
    const {organizationId, groupId} = req.params as {organizationId: string; groupId: string}

    const {from, ...filter} = (req.query as unknown) as CursoredRequestFilter
    const limit = Math.min(filter.limit ?? 20, 50)

    const {data: userIds, next: nextCursor, last} = await organizationService.getUsersByGroup(
      organizationId,
      groupId,
      limit,
      from,
    )

    const users = await userService.getAllByIds(userIds.map((user) => user.userId))
    res.json(
      actionSucceed({
        users: users.map((user: User) => {
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
        next: nextCursor,
        last,
      }),
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

    const a = organizationGroupDTOResponse(updatedGroup);

    res.json(actionSucceed(organizationGroupDTOResponse(updatedGroup)))
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
    const root = `/enterprise/admin/api/v3/organizations/:organizationId/groups`

    const groupRouter = innerRouter().use(
      '/',
      authMiddleware,
      innerRouter().get('/:groupId/users', getUsersByGroupId).put('/:groupId', updateGroup),
    )

    this.router.use(root, groupRouter)
  }
}

export default GroupController
