import * as express from 'express'
import {Handler, Router} from 'express'
import {authMiddleware} from '../../../../common/src/middlewares/auth'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {assertHasAuthorityOnDependent} from '../../middleware/user-dependent-authority'
import {AuthService} from '../../../../common/src/service/auth/auth-service'
import {UserService} from '../../services/user-service'
import {OrganizationService} from '../../services/organization-service'
import {MagicLinkService} from '../../../../common/src/service/messaging/magiclink-service'
import {CreateUserRequest, MigrateUserRequest} from '../../types/create-user-request'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {AuthenticationRequest} from '../../types/authentication-request'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {User} from '../../models/user'
import {UpdateUserRequest} from '../../types/update-user-request'
import {RegistrationConfirmationRequest} from '../../types/registration-confirmation-request'
import {ForbiddenException} from '../../../../common/src/exceptions/forbidden-exception'
import {ConnectOrganizationRequest} from '../../types/user-organization-request'
import {ResourceNotFoundException} from '../../../../common/src/exceptions/resource-not-found-exception'
import {ConnectGroupRequest, UpdateGroupRequest} from '../../types/user-group-request'

const authService = new AuthService()
const userService = new UserService()
const organizationService = new OrganizationService()
const magicLinkService = new MagicLinkService()

/**
 * Creates a user profile and returns a User
 */
const create: Handler = async (req, res, next): Promise<void> => {
  try {
    const profile = req.body as CreateUserRequest
    const user = await userService.create(profile)

    await magicLinkService.send({email: user.email, name: user.firstName})

    res.json(actionSucceed(user))
  } catch (error) {
    next(error)
  }
}

/**
 * Update a user's email, reset its `authUserId` and trigger a magic link for email verification
 * TODO: Handle authenticated user when handler behind an authenticated route
 *  const authenticatedUser = res.locals.authenticatedUser as User
 */
const updateEmail: Handler = async (req, res, next): Promise<void> => {
  try {
    const {userId, email} = req.body
    const user = await userService.updateEmail(userId, email)

    await magicLinkService.send({email: user.email, name: user.firstName})

    res.json(actionSucceed(user))
  } catch (error) {
    next(error)
  }
}

/**
 * Migrate existing user profile(s)
 */
const migrate: Handler = async (req, res, next): Promise<void> => {
  try {
    const {
      email,
      firstName,
      lastName,
      registrationId,
      legacyProfiles,
    } = req.body as MigrateUserRequest

    const user = await userService.create({email, firstName, lastName, registrationId})

    await userService.migrateExistingUser(legacyProfiles, user.id)

    await magicLinkService.send({email, name: firstName})

    res.json(actionSucceed(user))
  } catch (error) {
    next(error)
  }
}

/**
 * Sends a magic-link to authenticate a user
 */
const authenticate: Handler = async (req, res, next): Promise<void> => {
  try {
    const {email} = req.body as AuthenticationRequest
    await userService.getByEmail(email).then(async (user) => {
      if (user) return await magicLinkService.send({email: user.email, name: user.firstName})
      throw new BadRequestException(`Cannot authenticate with email [${email}]`)
    })

    res.json(actionSucceed())
  } catch (error) {
    next(error)
  }
}

/**
 * Get the authenticated user details
 */
const get: Handler = async (req, res, next): Promise<void> => {
  try {
    const authenticatedUser = res.locals.authenticatedUser as User
    res.json(actionSucceed(authenticatedUser))
  } catch (error) {
    next(error)
  }
}

/**
 * Update authenticated user
 */
const update: Handler = async (req, res, next): Promise<void> => {
  try {
    const authenticatedUser = res.locals.authenticatedUser as User
    const source = req.body as UpdateUserRequest
    const updatedUser = await userService.update(authenticatedUser.id, source)
    res.json(actionSucceed(updatedUser))
  } catch (error) {
    next(error)
  }
}

/**
 * Completes user registration with magic-link id-token
 */
const completeRegistration: Handler = async (req, res, next): Promise<void> => {
  try {
    const {userId, idToken} = req.body as RegistrationConfirmationRequest
    const user = await userService.getById(userId)
    const authUser = await authService.verifyAuthToken(idToken)

    if (!authUser) {
      throw new ForbiddenException('Cannot find user for the given token')
    }

    if (!authUser.emailVerified) {
      throw new ForbiddenException("Email hasn't been verified")
    }

    const activatedUser = await userService.activate({...user, authUserId: authUser.uid})
    res.json(actionSucceed(activatedUser))
  } catch (error) {
    next(error)
  }
}

/**
 * Fetch all the connected organizations of the authenticated user
 */
const getConnectedOrganizations: Handler = async (req, res, next): Promise<void> => {
  try {
    const authenticatedUser = res.locals.authenticatedUser as User
    const organizationIds = await userService.getAllConnectedOrganizationIds(authenticatedUser.id)
    const organizations = await organizationService.getAllByIds(organizationIds)

    res.json(actionSucceed(organizations))
  } catch (error) {
    next(error)
  }
}

/**
 * Fetch all the connected organizations of a dependent
 */
const getDependentConnectedOrganizations: Handler = async (req, res, next): Promise<void> => {
  try {
    const {dependentId} = req.params
    const organizationIds = await userService.getAllConnectedOrganizationIds(dependentId)
    const organizations = await organizationService.getAllByIds(organizationIds)

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
    const {id} = res.locals.authenticatedUser as User
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
 * Connect a dependent to an organization if relation doesn't yet exist
 */
const connectDependentToOrganization: Handler = async (req, res, next): Promise<void> => {
  try {
    const {dependentId} = req.params
    const {organizationId} = req.body as ConnectOrganizationRequest
    const organization = await organizationService.findOneById(organizationId)
    if (!organization) {
      throw new ResourceNotFoundException(`Cannot find organization [${organizationId}]`)
    }

    await userService.connectOrganization(dependentId, organizationId)

    res.json(actionSucceed())
  } catch (error) {
    next(error)
  }
}

/**
 * Removes the authenticated user from an organization and all the groups within that organization
 */
const disconnectOrganization: Handler = async (req, res, next): Promise<void> => {
  try {
    const authenticatedUser = res.locals.authenticatedUser as User
    const {organizationId} = req.params
    const organization = await organizationService.findOneById(organizationId)
    if (!organization) {
      throw new ResourceNotFoundException(`Cannot find organization [${organizationId}]`)
    }

    // Disconnect Organization and groups
    const groups = await organizationService.getGroups(organizationId)
    const groupIds = new Set(groups.map(({id}) => id))
    await userService.disconnectOrganization(authenticatedUser.id, organizationId, groupIds)

    res.json(actionSucceed())
  } catch (error) {
    next(error)
  }
}

/**
 * Removes the authenticated user's dependent from an organization and all the groups within that organization
 */
const disconnectDependentOrganization: Handler = async (req, res, next): Promise<void> => {
  try {
    const {dependentId, organizationId} = req.params
    const organization = await organizationService.findOneById(organizationId)
    if (!organization) {
      throw new ResourceNotFoundException(`Cannot find organization [${organizationId}]`)
    }

    // Disconnect Organization and groups
    const groups = await organizationService.getGroups(organizationId)
    const groupIds = new Set(groups.map(({id}) => id))
    await userService.disconnectOrganization(dependentId, organizationId, groupIds)

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
    const {id} = res.locals.authenticatedUser as User
    const {organizationId} = req.query
    const groupIds = await userService.getAllGroupIdsForUser(id)
    const groups = (await organizationService.getGroups(organizationId as string)).filter(({id}) =>
      groupIds.has(id),
    )

    res.json(actionSucceed(groups))
  } catch (error) {
    next(error)
  }
}

/**
 * Get all the user's dependent's connected-groups
 */
const getAllDependentConnectedGroupsInAnOrganization: Handler = async (
  req,
  res,
  next,
): Promise<void> => {
  try {
    const {dependentId} = req.params
    const {organizationId} = req.query
    const groupIds = await userService.getAllGroupIdsForUser(dependentId)
    const groups = (await organizationService.getGroups(organizationId as string)).filter(({id}) =>
      groupIds.has(id),
    )

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
    const authenticatedUser = res.locals.authenticatedUser as User
    const {organizationId, groupId} = req.body as ConnectGroupRequest
    const group = await organizationService.getGroup(organizationId, groupId)

    await userService.connectGroups(authenticatedUser.id, [group.id])

    res.json(actionSucceed())
  } catch (error) {
    next(error)
  }
}

/**
 * Connect a user's dependent to a group
 */
const connectDependentToGroup: Handler = async (req, res, next): Promise<void> => {
  try {
    const {dependentId} = req.params
    const {organizationId, groupId} = req.body as ConnectGroupRequest
    const group = await organizationService.getGroup(organizationId, groupId)

    await userService.connectGroups(dependentId, [group.id])

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
    const authenticatedUser = res.locals.authenticatedUser as User
    const {groupId} = req.params
    await userService.disconnectGroups(authenticatedUser.id, new Set([groupId]))

    res.json(actionSucceed())
  } catch (error) {
    next(error)
  }
}

/**
 * Update a user's dependent group within the same organization
 */
const updateDependentGroup: Handler = async (req, res, next): Promise<void> => {
  try {
    const {dependentId} = req.params
    const {organizationId, fromGroupId, toGroupId} = req.body as UpdateGroupRequest

    // Assert destination group exists
    await organizationService.getGroup(organizationId, toGroupId)

    // Update
    await userService.updateGroup(dependentId, fromGroupId, toGroupId)

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
    const {id} = res.locals.authenticatedUser as User
    const parents = await userService.getParents(id)
    res.json(actionSucceed(parents))
  } catch (error) {
    next(error)
  }
}

/**
 * Get Direct dependents for a given user-id
 * Only the approved parent-child relations will be returned
 */
const getDependents: Handler = async (req, res, next): Promise<void> => {
  try {
    const {id} = res.locals.authenticatedUser as User
    const dependents = await userService.getDirectDependents(id)
    res.json(actionSucceed(dependents))
  } catch (error) {
    next(error)
  }
}

/**
 * Add dependents to the authenticated user
 * If a `dependent.id` is provided, the matching dependent will be linked,
 * with a pending for approval state
 */
const addDependents: Handler = async (req, res, next): Promise<void> => {
  try {
    const {id} = res.locals.authenticatedUser as User
    const users = req.body as User[]
    const dependents = await userService.addDependents(users, id)
    res.json(actionSucceed(dependents))
  } catch (error) {
    next(error)
  }
}

/**
 * Update a dependent
 */
const updateDependent: Handler = async (req, res, next): Promise<void> => {
  try {
    const {dependentId} = req.params
    const updateRequest = req.body as UpdateUserRequest
    await userService.update(dependentId, updateRequest)

    res.json(actionSucceed())
  } catch (error) {
    next(error)
  }
}

/**
 * Remove a user as a dependent of the authenticated user
 * Delete the dependent's data if query param `hard` is true
 */
const removeDependent: Handler = async (req, res, next): Promise<void> => {
  try {
    const {id} = res.locals.authenticatedUser as User
    const {dependentId} = req.params
    const hard = req.query.hard ?? false
    await userService.removeDependent(dependentId, id)

    if (hard) {
      // TODO: Make transactional and support pessimistic isolation level
      await userService.disconnectAllGroups(dependentId)
      await userService.removeUser(dependentId)
    }

    res.json(actionSucceed())
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
    const root = '/api/v3/users'

    const authentication = innerRouter().use(
      '/',
      innerRouter()
        .post('/', create)
        .post('/email', updateEmail) // to be eventually deprecated if favour of `PUT -> /api/v3/users/self/email`
        .post('/migration', migrate)
        .post('/auth', authenticate)
        .post('/auth/registration-confirmation', completeRegistration),
    )

    const dependents = innerRouter().use(
      '/dependents',
      innerRouter().get('/', getDependents).post('/', addDependents).use(
        '/:dependentId',
        assertHasAuthorityOnDependent,
        innerRouter()
          .put('/', updateDependent)
          .delete('/', removeDependent)

          .get('/organizations', getDependentConnectedOrganizations)
          .post('/organizations', connectDependentToOrganization)
          .delete('/organizations/:organizationId', disconnectDependentOrganization)

          .get('/groups', getAllDependentConnectedGroupsInAnOrganization)
          .post('/groups', connectDependentToGroup)
          .put('/groups', updateDependentGroup),
      ),
    )

    const profile = innerRouter().use(
      '/self',
      authMiddleware,
      innerRouter()
        .get('/', get)
        .put('/', update)
        .get('/parents', getParents)

        .get('/organizations', getConnectedOrganizations)
        .post('/organizations', connectOrganization)
        .delete('/organizations/:organizationId', disconnectOrganization)

        .get('/groups', getAllConnectedGroupsInAnOrganization)
        .post('/groups', connectGroup)
        .delete('/groups/:groupId', disconnectGroup)

        .use(dependents),
    )

    this.router.use(root, authentication, profile)
  }
}

export default UserController
