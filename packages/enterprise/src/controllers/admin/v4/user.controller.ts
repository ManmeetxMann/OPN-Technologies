import * as express from 'express'
import {Handler, Router} from 'express'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {UserService} from '../../../services/user-service'
import {OrganizationService} from '../../../services/organization-service'
import {
  actionReplyInsufficientPermission,
  actionSucceed,
} from '../../../../../common/src/utils/response-wrapper'
import {userDTOFrom} from '../../../models/user'
import {User} from '../../../../../common/src/data/user'
import {AdminProfile} from '../../../../../common/src/data/admin'
import {authMiddleware} from '../../../../../common/src/middlewares/auth'
import {CursoredUsersRequestFilter} from '../../../types/user-organization-request'

const userService = new UserService()
const organizationService = new OrganizationService()

/**
 * Returns a page of users matching filter
 */
const findAll: Handler = async (req, res, next): Promise<void> => {
  try {
    const {organizationId, ...filter} = (req.query as unknown) as CursoredUsersRequestFilter
    const admin = (res.locals.authenticatedUser as User).admin as AdminProfile

    // Assert admin has granted access to organization
    const hasGrantedAccess = new Set(
      ...(admin?.superAdminForOrganizationIds ?? []),
      ...(admin?.adminForOrganizationId ?? []),
    ).has(organizationId)
    if (!hasGrantedAccess) {
      res.status(403).json(actionReplyInsufficientPermission())
      return
    }

    // Fetch users
    const users = await userService.findAllUsers({
      ...filter,
      organizationId,
      limit: Math.min(filter.limit ?? 20, 50),
    })

    // Fetch groups
    const groupNamesById = await organizationService
      .getGroups(organizationId)
      .then((groups) => groups.reduce((byId, {id, name}) => ({...byId, [id]: name}), {}))
    const groupNamesByUserId = await organizationService
      .getUsersGroups(
        organizationId,
        null,
        users.map(({id}) => id),
      )
      .then((userGroups) =>
        userGroups.reduce(
          (byUserId, {groupId, userId}) => ({...byUserId, [userId]: groupNamesById[groupId] ?? ''}),
          {},
        ),
      )

    // Remap users
    const data = users.map((user) => ({
      ...userDTOFrom(user),
      groupName: groupNamesByUserId[user.id],
      memberId: user.memberId,
      createdAt: user.timestamps?.createdAt?.toDate().toISOString(),
      updatedAt: user.timestamps?.updatedAt?.toDate().toISOString(),
    }))

    res.json({
      ...actionSucceed(data),
      last: filter.from ?? null,
      next: data[data.length - 1]?.id ?? null,
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

    this.router.use(root, authMiddleware, innerRouter().get('/', findAll))
  }
}

export default UserController
