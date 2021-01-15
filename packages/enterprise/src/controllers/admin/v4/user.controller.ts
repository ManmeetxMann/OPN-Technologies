import * as express from 'express'
import {Handler, Router} from 'express'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {UserService} from '../../../services/user-service'
import {OrganizationService} from '../../../services/organization-service'
import {
  actionReplyInsufficientPermission,
  actionSucceed,
} from '../../../../../common/src/utils/response-wrapper'
import {userDTOResponse} from '../../../models/user'
import {User} from '../../../../../common/src/data/user'
import {AdminProfile} from '../../../../../common/src/data/admin'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {CursoredUsersRequestFilter} from '../../../types/user-organization-request'
import {OrganizationGroup} from '../../../models/organization'
import {omit} from 'lodash'

const userService = new UserService()
const organizationService = new OrganizationService()

/**
 * Returns a page of users matching filter
 */
const findAll: Handler = async (req, res, next): Promise<void> => {
  try {
    const {organizationId, ...filter} = (req.query as unknown) as CursoredUsersRequestFilter
    const limit = Math.min(filter.limit ?? 20, 50)
    const admin = (res.locals.authenticatedUser as User).admin as AdminProfile

    // Assert admin has granted access to organization
    const authorizedOrganizationIds = [
      ...(admin?.superAdminForOrganizationIds ?? []),
      admin?.adminForOrganizationId,
    ].filter((id) => !!id)
    const hasGrantedAccess = new Set(authorizedOrganizationIds).has(organizationId)
    if (!hasGrantedAccess) {
      res.status(403).json(actionReplyInsufficientPermission())
      return
    }

    // Fetch users
    const users = await userService.findAllUsers({
      ...filter,
      organizationId,
      limit,
    })

    // Fetch groups
    const groupsById: Record<string, OrganizationGroup> = await organizationService
      .getGroups(organizationId)
      .then((groups) => groups.reduce((byId, group) => ({...byId, [group.id]: group}), {}))

    const groupsByUserId: Record<string, OrganizationGroup> = await organizationService
      .getUsersGroups(
        organizationId,
        null,
        users.map(({id}) => id),
      )
      .then((userGroups) =>
        userGroups.reduce(
          (byUserId, {groupId, userId}) => ({...byUserId, [userId]: groupsById[groupId]}),
          {},
        ),
      )

    // Remap users
    const data = users.map((user) => ({
      ...userDTOResponse(user),
      groupId: groupsByUserId[user.id]?.id,
      groupName: groupsByUserId[user.id]?.name,
      memberId: user.memberId,
      createdAt: user.timestamps?.createdAt?.toDate().toISOString(),
      updatedAt: user.timestamps?.updatedAt?.toDate().toISOString(),
    }))

    res.json({
      ...omit(actionSucceed(data), 'page'),
      last: filter.from ?? null,
      next: data.length < limit ? null : data[data.length - 1].id,
    })
  } catch (error) {
    next(error)
  }
}

class UserController implements IControllerBase {
  public router = express.Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = () => Router({mergeParams: true})
    const root = '/enterprise/admin/api/v4/users'

    this.router.use(
      root,
      authorizationMiddleware([RequiredUserPermission.OrgAdmin]),
      innerRouter().get('/', findAll),
    )
  }
}

export default UserController
