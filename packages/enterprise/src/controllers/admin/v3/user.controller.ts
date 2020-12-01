import * as express from 'express'
import {Handler, Router} from 'express'
import {authMiddleware} from '../../../../common/src/middlewares/auth'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {UserService} from '../../services/user-service'
import {OrganizationService} from '../../services/organization-service'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {User, userDTOResponse} from '../../models/user'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {CreateUserByAdminRequest} from '../../types/new-user'
import {UpdateUserByAdminRequest} from '../../types/update-user-request'
import {UsersByOrganizationRequest} from '../../types/user-organization-request'
import {flatten} from 'lodash'

const userService = new UserService()
const organizationService = new OrganizationService()

/**
 * Get all users for a given org-id
 * Paginated result will be returned
 */
const getUsersByOrganizationId: Handler = async (req, res, next): Promise<void> => {
  try {
    const {perPage, page, organizationId, searchQuery} = req.query as UsersByOrganizationRequest

    if (perPage < 1 || page < 0) {
      throw new BadRequestException(`Pagination params are invalid`)
    }
    let users = []
    if (searchQuery) {
      users = await userService.searchByQueryAndOrganizationId(organizationId, searchQuery)
      users = flatten(users)
    } else {
      users = await userService.getAllByOrganizationId(organizationId, page, perPage)
    }

    const usersGroups = await organizationService.getUsersGroups(
      organizationId,
      null,
      users.map((user) => user.id),
    )

    const orgGroups = await organizationService.getGroups(organizationId)
    const groupsById: Record<string, OrganizationGroup> = orgGroups.reduce(
      (lookup, orgGroup) => ({
        ...lookup,
        [orgGroup.id]: orgGroup,
      }),
      {},
    )

    const groupsByUserId: Record<string, OrganizationGroup> = usersGroups.reduce(
      (lookup, usersGroup) => ({
        ...lookup,
        [usersGroup.userId]: groupsById[usersGroup.groupId],
      }),
      {},
    )

    const resultUsers = await Promise.all(
      users.map(async (user: User) => {
        return {
          ...userDTOFrom(user),
          groupId: groupsByUserId[user.id]?.id,
          groupName: groupsByUserId[user.id]?.name,
          memberId: user.memberId,
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
    )
    res.json(actionSucceed(resultUsers, page))
  } catch (error) {
    next(error)
  }
}

/**
 * Creates a user and returns a User
 */
const createUser: Handler = async (req, res, next): Promise<void> => {
  try {
    const {organizationId, groupId, memberId, ...profile} = req.body as CreateUserByAdminRequest
    // Assert organization exists
    await organizationService.getByIdOrThrow(organizationId)

    // Assert that the group exists
    await organizationService.getGroup(organizationId, groupId)

    const user = await userService.create({
      ...profile,
    })
    // Connect to org
    await userService.connectOrganization(user.id, organizationId)

    await organizationService.addUserToGroup(organizationId, groupId, user.id)

    if (memberId) {
      await userService.createOrganizationProfile(user.id, organizationId, memberId)
    }

    res.json(actionSucceed(userDTOFrom(user)))
  } catch (error) {
    next(error)
  }
}

/**
 * Update user
 */
const updateUser: Handler = async (req, res, next): Promise<void> => {
  try {
    const {organizationId, groupId, ...source} = req.body as UpdateUserByAdminRequest
    const {userId} = req.params
    const updatedUser = await userService.updateByAdmin(userId, source)

    // Assert that the group exists
    await organizationService.getGroup(organizationId, groupId)

    if (groupId) {
      const currentGroup = await organizationService.getUserGroup(organizationId, userId)
      await organizationService.updateGroupForUser(organizationId, currentGroup.id, userId, groupId)
    }

    res.json(actionSucceed(userDTOFrom(updatedUser)))
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
    const root = '/enterprise/admin/api/v3/users'

    const route = innerRouter().use(
      '/',
      innerRouter()
        .get('/', authMiddleware, getUsersByOrganizationId)
        .post('/', authMiddleware, createUser)
        .put('/:userId', authMiddleware, updateUser),
    )

    this.router.use(root, route)
  }
}

export default UserController
