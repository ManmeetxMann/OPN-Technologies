import {Handler} from 'express'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {CreateUserRequest, MigrateUserRequest} from '../../types/create-user-request'
import {MagicLinkService} from '../../../../common/src/service/messaging/magiclink-service'
import {AuthenticationRequest} from '../../types/authentication-request'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {ConnectionStatuses, User, UserMatcher} from '../../models/user'
import {UpdateUserRequest} from '../../types/update-user-request'
import {AuthService} from '../../../../common/src/service/auth/auth-service'
import {RegistrationConfirmationRequest} from '../../types/registration-confirmation-request'
import {OrganizationService} from '../../services/organization-service'
import {ResourceNotFoundException} from '../../../../common/src/exceptions/resource-not-found-exception'
import {UserService} from '../../services/user-service'
import {ConnectOrganizationRequest} from '../../types/user-organization-request'
import {ConnectGroupRequest} from '../../types/user-group-request'
import {ForbiddenException} from '../../../../common/src/exceptions/forbidden-exception'

const authService = new AuthService()
const userService = new UserService()
const organizationService = new OrganizationService()
const magicLinkService = new MagicLinkService()

/**
 * Creates a user profile and returns a User
 */
export const create: Handler = async (req, res, next): Promise<void> => {
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
 * Migrate existing user profile(s)
 */
export const migrate: Handler = async (req, res, next): Promise<void> => {
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
export const authenticate: Handler = async (req, res, next): Promise<void> => {
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
 * Find users
 */
export const findAll: Handler = async (req, res, next): Promise<void> => {
  try {
    const matcher = req.body as UserMatcher
    const users = await userService.findUsersBy(matcher)
    res.json(actionSucceed(users))
  } catch (error) {
    next(error)
  }
}

/**
 * Get the authenticated user details
 */
export const get: Handler = async (req, res, next): Promise<void> => {
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
export const update: Handler = async (req, res, next): Promise<void> => {
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
export const completeRegistration: Handler = async (req, res, next): Promise<void> => {
  try {
    const {userId, idToken} = req.body as RegistrationConfirmationRequest
    const user = await userService.getById(userId)
    const authUser = await authService.verifyAuthToken(idToken)

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
export const getConnectedOrganizations: Handler = async (req, res, next): Promise<void> => {
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
 * Connect an organization to the authenticated user, if relation doesn't yet exist
 */
export const connectOrganization: Handler = async (req, res, next): Promise<void> => {
  try {
    const {id, email} = res.locals.authenticatedUser as User
    const {organizationId} = req.body as ConnectOrganizationRequest
    const organization = await organizationService.findOneById(organizationId)
    if (!organization) {
      throw new ResourceNotFoundException(`Cannot find organization [${organizationId}]`)
    }

    await userService.connectOrganization(id, organizationId, email)

    res.json(actionSucceed())
  } catch (error) {
    next(error)
  }
}

/**
 * Removes the authenticated user from an organization and all the groups within that organization
 */
export const disconnectOrganization: Handler = async (req, res, next): Promise<void> => {
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
 * Get all the user's connected-groups
 */
export const getAllConnectedGroupsInAnOrganization: Handler = async (
  req,
  res,
  next,
): Promise<void> => {
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
 * Connect a user to a group
 */
export const connectGroup: Handler = async (req, res, next): Promise<void> => {
  try {
    const authenticatedUser = res.locals.authenticatedUser as User
    const {organizationId, groupId} = req.body as ConnectGroupRequest
    const group = await organizationService.getGroup(organizationId, groupId)

    await userService.connectGroups(authenticatedUser.id, [group])

    res.json(actionSucceed())
  } catch (error) {
    next(error)
  }
}

/**
 * Disconnect a user from a group
 */
export const disconnectGroup: Handler = async (req, res, next): Promise<void> => {
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
 * Get Direct parents for a given user-id
 * Only the approved parent-child relations will be returned
 */
export const getParents: Handler = async (req, res, next): Promise<void> => {
  try {
    const {id} = res.locals.authenticatedUser as User
    const parents = await userService.getParents(id, [ConnectionStatuses.Approved])
    res.json(actionSucceed(parents))
  } catch (error) {
    next(error)
  }
}

/**
 * Get Direct dependents for a given user-id
 * Only the approved parent-child relations will be returned
 */
export const getDependents: Handler = async (req, res, next): Promise<void> => {
  try {
    const {id} = res.locals.authenticatedUser as User
    const dependents = await userService.getDirectDependents(id, [ConnectionStatuses.Approved])
    res.json(actionSucceed(dependents))
  } catch (error) {
    next(error)
  }
}

/**
 * Add dependents to the authenticated user
 */
export const addDependents: Handler = async (req, res, next): Promise<void> => {
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
export const updateDependent: Handler = async (req, res, next): Promise<void> => {
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
export const removeDependent: Handler = async (req, res, next): Promise<void> => {
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
