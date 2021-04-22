import * as express from 'express'
import {Handler, Router} from 'express'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {UserService} from '../../services/user-service'
import {OrganizationService} from '../../services/organization-service'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {userDTOResponse} from '../../models/user'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {CreateUserByAdminRequest} from '../../types/new-user'
import {UpdateUserByAdminRequest} from '../../types/update-user-request'
import {UsersByOrganizationRequest} from '../../types/user-organization-request'
import {OrganizationGroup} from '../../models/organization'
import {flatten} from 'lodash'
import {AuthUser} from '../../../../common/src/data/user'
import {UserSyncService} from '../../services/user-sync-service'

const userService = new UserService()
const organizationService = new OrganizationService()
const userSyncService = new UserSyncService()

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
    const groupsById: Record<string, {id: string; name: string}> = orgGroups.reduce(
      (lookup, orgGroup) => ({
        ...lookup,
        [orgGroup.id]: {
          id: orgGroup.id,
          name: orgGroup.name,
        },
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
      users.map(async (user: AuthUser) => {
        return {
          ...userDTOResponse(user),
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
      organizationId,
    })

    await userSyncService.create({
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: (user.phone && user.phone.number && `${user.phone.number}`) || '',
      photoUrl: user.photo,
      firebaseKey: user.id,
      patientPublicId: '', // @TODO Remove this field after merging PR related to this field
      registrationId: user.registrationId || '',
      dateOfBirth: '',
      dependants: [],
      delegates: [],
    })

    await organizationService.addUserToGroup(organizationId, groupId, user.id)

    if (memberId) {
      await userService.createOrganizationProfile(user.id, organizationId, memberId)
    }

    res.json(actionSucceed(userDTOResponse(user)))
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

    await userSyncService.updateByAdmin(updatedUser.id, source)

    // Assert that the group exists
    await organizationService.getGroup(organizationId, groupId)

    if (groupId) {
      const currentGroup = await organizationService.getUserGroup(organizationId, userId)
      await organizationService.updateGroupForUser(organizationId, currentGroup.id, userId, groupId)
    }

    res.json(actionSucceed(userDTOResponse(updatedUser)))
  } catch (error) {
    next(error)
  }
}

class AdminUserController implements IControllerBase {
  public router = express.Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = () => Router({mergeParams: true})
    const root = '/enterprise/admin/api/v3/users'
    const requireAdminWithOrg = authorizationMiddleware([RequiredUserPermission.OrgAdmin], true)
    const route = innerRouter().use(
      '/',
      innerRouter()
        .get('/', requireAdminWithOrg, getUsersByOrganizationId)
        .post('/', requireAdminWithOrg, createUser)
        .put('/:userId', requireAdminWithOrg, updateUser),
    )

    this.router.use(root, route)
  }
}

export default AdminUserController
