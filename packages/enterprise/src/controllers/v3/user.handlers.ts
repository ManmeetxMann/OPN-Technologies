import {Handler} from 'express'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {CreateUserRequest} from '../../types/create-user-request'
import {MagicLinkService} from '../../../../common/src/service/messaging/magiclink-service'
import {AuthenticationRequest} from '../../types/authentication-request'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {User} from '../../models/user'
import {UpdateUserRequest} from '../../types/update-user-request'
import {AuthService} from '../../../../common/src/service/auth/auth-service'
import {RegistrationConfirmationRequest} from '../../types/registration-confirmation-request'
import {OrganizationService} from '../../services/organization-service'
import {ResourceNotFoundException} from '../../../../common/src/exceptions/resource-not-found-exception'
import {UserService} from '../../services/user-service'
import {
  ConnectOrganizationRequest,
  DisconnectOrganizationRequest,
} from '../../types/user-organization-request'
import {ConnectGroupRequest, DisconnectGroupRequest} from '../../types/user-group-request'

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
 * Sends a magic-link to authenticate a user
 */
export const authenticate: Handler = async (req, res, next): Promise<void> => {
  try {
    const {email} = req.body as AuthenticationRequest
    await userService.getByEmail(email).then(async (user) => {
      if (user) await magicLinkService.send({email: user.email, name: user.firstName})
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
    const activatedUser = await userService.activate({...user, authId: authUser.uid})
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
    const authenticatedUser = res.locals.authenticatedUser as User
    const {organizationId} = req.body as ConnectOrganizationRequest
    const organization = await organizationService.findOneById(organizationId)
    if (!organization) {
      throw new ResourceNotFoundException(`Cannot find organization [${organizationId}]`)
    }

    await userService.connectOrganization(authenticatedUser.id, organizationId)

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
    const {organizationId} = req.body as DisconnectOrganizationRequest
    const organization = await organizationService.findOneById(organizationId)
    if (!organization) {
      throw new ResourceNotFoundException(`Cannot find organization [${organizationId}]`)
    }

    // Disconnect Groups
    await organizationService
      .getGroups(organizationId)
      .then((groups) => userService.disconnectGroups(authenticatedUser.id, groups))

    // Disconnect Organization
    await userService.disconnectOrganization(authenticatedUser.id, organizationId)

    res.json(actionSucceed())
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
    const {organizationId, groupId} = req.body as DisconnectGroupRequest
    const group = await organizationService.getGroup(organizationId, groupId)

    await userService.disconnectGroups(authenticatedUser.id, [group])

    res.json(actionSucceed())
  } catch (error) {
    next(error)
  }
}

/**
 * Get Direct parents for a given user-id
 */
export const getParents: Handler = async (req, res, next): Promise<void> => {
  try {
    const {id} = res.locals.connectedUser as User
    const parents = await userService.getParents(id)
    res.json(actionSucceed(parents))
  } catch (error) {
    next(error)
  }
}

/**
 * Get Direct dependents for a given user-id
 */
export const getDependents: Handler = async (req, res, next): Promise<void> => {
  try {
    const {id} = res.locals.connectedUser as User
    const dependents = await userService.getDirectDependents(id)
    res.json(actionSucceed(dependents))
  } catch (error) {
    next(error)
  }
}

export const addDependents: Handler = async (req, res, next): Promise<void> => {
  try {
    // TODO
    res.json(actionSucceed())
  } catch (error) {
    next(error)
  }
}

export const removeDependent: Handler = async (req, res, next): Promise<void> => {
  try {
    // TODO
    res.json(actionSucceed())
  } catch (error) {
    next(error)
  }
}
