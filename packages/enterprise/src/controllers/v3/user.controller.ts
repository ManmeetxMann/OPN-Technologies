import * as express from 'express'
import {Handler, Router} from 'express'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {AuthService} from '../../../../common/src/service/auth/auth-service'
import {AdminApprovalService} from '../../../../common/src/service/user/admin-service'
import {UserService} from '../../services/user-service'
import {UserSyncService} from '../../services/user-sync-service'
import {OrganizationService} from '../../services/organization-service'
import {MagicLinkService} from '../../../../common/src/service/messaging/magiclink-service'
import {CreateUserRequest} from '../../types/new-user'
import {
  actionReplyInsufficientPermission,
  actionSucceed,
} from '../../../../common/src/utils/response-wrapper'
import {AuthenticationRequest} from '../../types/authentication-request'
import {userDTOResponse} from '../../models/user'
import {UpdateUserRequest} from '../../types/update-user-request'
import {RegistrationConfirmationRequest} from '../../types/registration-confirmation-request'
import {ForbiddenException} from '../../../../common/src/exceptions/forbidden-exception'
import {ConnectOrganizationRequest} from '../../types/user-organization-request'
import {ResourceNotFoundException} from '../../../../common/src/exceptions/resource-not-found-exception'
import {ConnectGroupRequest, UpdateGroupRequest} from '../../types/user-group-request'
import {AdminProfile} from '../../../../common/src/data/admin'
import {AuthUser, User as AuthenticatedUser} from '../../../../common/src/data/user'
import {uniq, flatten} from 'lodash'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {AuthShortCodeService} from '../../services/auth-short-code-service'
import moment from 'moment'
import {LogInfo, LogError} from '../../../../common/src/utils/logging-setup'
import {getUserId} from '../../../../common/src/utils/auth'
import {UserLogsEvents as events, UserLogsFunctions as functions} from '../../types/new-user'

const authService = new AuthService()
const adminApprovalService = new AdminApprovalService()
const userService = new UserService()
const userSyncService = new UserSyncService()
const organizationService = new OrganizationService()
const magicLinkService = new MagicLinkService()
const authShortCodeService = new AuthShortCodeService()

/**
 * Search a user(s) profile and returns a User(s)
 */
const search: Handler = async (req, res, next): Promise<void> => {
  try {
    const {searchQuery} = req.query as {searchQuery: string}

    const authenticatedUser = res.locals.connectedUser as AuthenticatedUser
    const admin = authenticatedUser.admin as AdminProfile

    if (!admin || !admin.adminForOrganizationId || !admin.superAdminForOrganizationIds.length) {
      res.status(403).json(actionReplyInsufficientPermission())
      return
    }

    const adminForOrganizationIds = uniq([
      ...admin.superAdminForOrganizationIds,
      ...[admin.adminForOrganizationId],
    ])

    const usersResponse = await Promise.all(
      adminForOrganizationIds.map(async (organizationId) => {
        const usersArray = await userService.searchByQueryAndOrganizationId(
          organizationId,
          searchQuery,
        )

        const usersUniqueById = [
          ...new Map(flatten(usersArray).map((item) => [item.id, item])).values(),
        ]

        return await Promise.all(
          usersUniqueById.map(async (user: AuthUser) => {
            const groupName = await organizationService
              .getUserGroup(organizationId, user.id)
              .then(({name}) => name)
              .catch(() => '')

            return {
              ...userDTOResponse(user),
              groupName,
              memberId: user.memberId,
            }
          }),
        )
      }),
    )

    res.json(actionSucceed(flatten(usersResponse)))
  } catch (error) {
    next(error)
  }
}

/**
 * Creates a user profile and returns a User
 */
const create: Handler = async (req, res, next): Promise<void> => {
  try {
    const {organizationId, idToken, ...profile} = req.body as CreateUserRequest

    const authUser = await authService.verifyAuthToken(idToken)
    if (!authUser) {
      throw new ForbiddenException('Cannot verify the given id-token')
    }

    // Assert organization exists
    await organizationService.getByIdOrThrow(organizationId)

    // Create and activate user
    const user = await userService.create({
      ...profile,
      organizationId,
      email: authUser.email,
      authUserId: authUser.uid,
      active: true,
    })

    await userSyncService.create(
      {
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
      },
      {
        authUserId: user.authUserId as string,
        email: user.email,
      },
    )

    LogInfo(functions.create, events.createUser, {
      newUser: user,
      createdBy: 'API',
    })

    res.json(actionSucceed(userDTOResponse(user)))
  } catch (error) {
    LogError(functions.create, events.createUserError, {...error})
    next(error)
  }
}

/**
 * Sends a magic-link to authenticate a user
 */
const authenticate: Handler = async (req, res, next): Promise<void> => {
  try {
    const {email, userId} = req.body as AuthenticationRequest
    const organizationId = req.body.organizationId ?? ''
    if (organizationId) {
      await organizationService.getByIdOrThrow(organizationId)
    }

    const authShortCode = await authShortCodeService.generateAndSaveShortCode(
      email,
      organizationId,
      userId,
    )

    await magicLinkService.send({
      email,
      meta: {
        shortCode: authShortCode.shortCode,
        signInLink: authShortCode.magicLink,
      },
    })

    res.json(actionSucceed())
  } catch (error) {
    next(error)
  }
}

/**
 * Validate short code to authenticate a user
 */
const validateShortCode: Handler = async (req, res, next): Promise<void> => {
  try {
    const {shortCode, email} = req.body

    const authShortCode = await authShortCodeService.findAuthShortCode(email)

    if (!authShortCode) {
      throw new BadRequestException('Short code invalid or expired')
    }
    const isValid =
      //@ts-ignore
      moment().isBefore(moment(authShortCode.expiresAt.toDate())) &&
      authShortCode.shortCode.toUpperCase() === shortCode.toUpperCase()

    if (!isValid) {
      throw new BadRequestException('Short code invalid or expired')
    }
    await authShortCodeService.clearShortCode(authShortCode.id)

    res.json(actionSucceed({magicLink: authShortCode.magicLink}))
  } catch (error) {
    next(error)
  }
}

/**
 * Get the authenticated user details
 */
const get: Handler = async (req, res, next): Promise<void> => {
  try {
    const authenticatedUser = res.locals.authenticatedUser as AuthUser
    let hasApproval = false
    if (authenticatedUser.email) {
      // check if there's an adminApproval for this user
      const approval = await adminApprovalService.findOneByEmail(authenticatedUser.email)
      if (!!approval) {
        hasApproval = true
      }
    }
    res.json(actionSucceed(userDTOResponse(authenticatedUser, hasApproval)))
  } catch (error) {
    next(error)
  }
}

/**
 * Update authenticated user
 */
const update: Handler = async (req, res, next): Promise<void> => {
  try {
    const authenticatedUser = res.locals.authenticatedUser as AuthUser
    const source = req.body as UpdateUserRequest
    const oldUser = await userService.getById(authenticatedUser.id)
    const updatedUser = await userService.update(authenticatedUser.id, source)

    await userSyncService.update(updatedUser.id, source)

    LogInfo(functions.update, events.updateUser, {
      oldUser,
      updatedUser,
      updatedBy: getUserId(res.locals.authenticatedUser),
    })

    res.json(actionSucceed(userDTOResponse(updatedUser)))
  } catch (error) {
    LogError(functions.update, events.updateUserError, {...error})
    next(error)
  }
}

/**
 * Completes user registration with magic-link id-token
 */
const completeRegistration: Handler = async (req, res, next): Promise<void> => {
  try {
    const {idToken, organizationId, userId} = req.body as RegistrationConfirmationRequest
    const authUser = await authService.verifyAuthToken(idToken)

    if (!authUser || !authUser.email) {
      throw new ForbiddenException('Cannot verify the given id-token')
    }

    let user = await userService.getByEmail(authUser.email)
    if (!user) {
      user = await userService.getById(userId)
      if (!!user.email) {
        console.error(
          `UserIDUseDifferentEmail: ${userId} use email ${user.email} but requesting to login as ${authUser.email}!`,
        )
        throw new ForbiddenException(`UserID: ${userId} is using different Email`)
      }
    } else if (userId && userId !== user.id) {
      console.log(
        `UserIDIgnored: ${userId}: Email: ${authUser.email} is already used by UserID: ${user.id}`,
      )
    }

    await organizationService
      .getByIdOrThrow(organizationId)
      .then(() => userService.connectOrganization(user.id, organizationId))

    const activatedUser = await userService.activate({
      ...user,
      email: authUser.email,
      authUserId: authUser.uid,
    })
    res.json(actionSucceed(userDTOResponse(activatedUser)))
  } catch (error) {
    next(error)
  }
}

/**
 * Fetch all the connected organizations of the authenticated user
 */
const getConnectedOrganizations: Handler = async (req, res, next): Promise<void> => {
  try {
    const authenticatedUser = res.locals.authenticatedUser as AuthUser
    const user = await userService.getById(authenticatedUser.id)
    const organizations = await organizationService.getAllByIds(user.organizationIds)

    res.json(actionSucceed(organizations))
  } catch (error) {
    next(error)
  }
}


/**
 * Connect an organization to the authenticated user, if relation doesn't yet exist
 */
const connectOrganization: Handler = async (req, res, next): Promise<void> => {
  try {
    const {id} = res.locals.authenticatedUser as AuthUser
    const {organizationId} = req.body as ConnectOrganizationRequest
    const organization = await organizationService.findOneById(organizationId)
    if (!organization) {
      throw new ResourceNotFoundException(`Cannot find organization [${organizationId}]`)
    }

    await userService.connectOrganization(id, organizationId)

    res.json(actionSucceed())
  } catch (error) {
    next(error)
  }
}


/**
 * Get all the user's connected-groups
 */
const getAllConnectedGroupsInAnOrganization: Handler = async (req, res, next): Promise<void> => {
  try {
    const {id} = res.locals.authenticatedUser as AuthUser
    const {organizationId} = req.query
    const groupIds = await userService.getAllGroupIdsForUser(id)
    const groups = (
      await organizationService.getPublicGroups(organizationId as string)
    ).filter(({id}) => groupIds.has(id))

    res.json(actionSucceed(groups))
  } catch (error) {
    next(error)
  }
}

/**
 * Connect a user to a group
 */
const connectGroup: Handler = async (req, res, next): Promise<void> => {
  try {
    const authenticatedUser = res.locals.authenticatedUser as AuthUser
    const {organizationId, groupId} = req.body as ConnectGroupRequest

    // validate that the group exists
    await organizationService.getGroup(organizationId, groupId)

    await organizationService.addUserToGroup(organizationId, groupId, authenticatedUser.id)
    // adds to root collection. Disabled for compatibility

    res.json(actionSucceed())
  } catch (error) {
    next(error)
  }
}

/**
 * Disconnect a user from a group
 */
const disconnectGroup: Handler = async (req, res, next): Promise<void> => {
  try {
    const authenticatedUser = res.locals.authenticatedUser as AuthUser
    const {groupId} = req.params
    await userService.disconnectGroups(authenticatedUser.id, new Set([groupId]))

    res.json(actionSucceed())
  } catch (error) {
    next(error)
  }
}


/**
 * Get Direct parents for a given user-id
 * Only the approved parent-child relations will be returned
 */
const getParents: Handler = async (req, res, next): Promise<void> => {
  try {
    const {id} = res.locals.authenticatedUser as AuthUser
    const parents = await userService.getParents(id)
    res.json(actionSucceed(parents.map((dependant) => userDTOResponse(dependant))))
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

    const root = '/enterprise/api/v3/users'

    const authentication = innerRouter().use(
      '/',
      innerRouter()
        .get('/search', authorizationMiddleware([RequiredUserPermission.OrgAdmin]), search)
        .post('/', create)
        .post('/auth', authenticate)
        .post('/auth/short-code', validateShortCode)
        .post('/auth/confirmation', completeRegistration),
    )

    // authenticate the user without requiring an organizationId
    const regUser = authorizationMiddleware([RequiredUserPermission.RegUser], false)
    // authenticate the user while requiring an organizationId
    const regUserWithOrg = authorizationMiddleware([RequiredUserPermission.RegUser], true)

    const selfProfile = innerRouter().use(
      '/self',
      innerRouter()
        .get('/', regUser, get)
        .put('/', regUser, update)
        .get('/organizations', regUser, getConnectedOrganizations)
        // regUser is not an error even though this request contains organizationId
        .post('/organizations', regUser, connectOrganization)

        .get('/groups', regUserWithOrg, getAllConnectedGroupsInAnOrganization)
        .post('/groups', regUserWithOrg, connectGroup)
        .delete('/groups/:groupId', regUser, disconnectGroup)

        .get('/parents', regUser, getParents)
    )

    this.router.use(root, authentication, selfProfile)
  }
}

export default UserController
