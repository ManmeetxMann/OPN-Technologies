import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

import Validation from '../../../common/src/utils/validation'
import {OrganizationService} from '../services/organization-service'
import {OrganizationConnectionRequest} from '../models/organization-connection-request'
import {UserService} from '../../../common/src/service/user/user-service'
import {UserService as EnterpriseUserService} from '../services/user-service'
import {RegistrationService} from '../../../common/src/service/registry/registration-service'
import {User, UserEdit, UserWithGroup, UserDependant} from '../../../common/src/data/user'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {Organization, OrganizationUsersGroup} from '../models/organization'
import * as _ from 'lodash'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {AuthService} from '../../../common/src/service/auth/auth-service'
import {UnauthorizedException} from '../../../common/src/exceptions/unauthorized-exception'
import {ResourceAlreadyExistsException} from '../../../common/src/exceptions/resource-already-exists-exception'

class UserController implements IControllerBase {
  public path = '/user'
  public router = express.Router()
  private organizationService = new OrganizationService()
  private userService = new UserService()
  private enterpriseUserService = new EnterpriseUserService()
  private registrationService = new RegistrationService()
  private authService = new AuthService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/connect/add', this.connect)
    this.router.post(this.path + '/connect/v2/add', this.connect)
    this.router.post(this.path + '/connect/remove', this.disconnect)
    this.router.post(this.path + '/connect/locations', this.connectedLocations)
    this.router.put(this.path + '/connect/link/:userId', this.userLink)
    this.router.put(this.path + '/connect/edit/:userId', this.userEdit)
    this.router.get(this.path + '/connect/:organizationId/users/:userId', this.getUser)
  }

  // Note: Doesn't handle multiple organizations per user as well as checking an existing connection
  connect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {responses, ...body} = req.body
      body as OrganizationConnectionRequest
      responses as string[]
      const {
        idToken,
        organizationId,
        registrationId,
        firstName,
        lastName,
        base64Photo,
        groupId,
      } = body
      const organization = await this.organizationService.findOneById(organizationId)
      const group = await this.organizationService.getGroup(organization.id, groupId)

      const authUser = !!idToken ? await this.authService.verifyAuthToken(idToken) : null
      if (idToken && (!authUser || !authUser.email)) {
        throw new UnauthorizedException(`Cannot verify id-token`)
      }

      if (authUser) {
        // check if auth user is already there
        const usersByEmail = await this.enterpriseUserService.getByEmail(authUser.email)
        if (usersByEmail) {
          console.log(`DuplicateEmailConnect: ${authUser.email}`)
          throw new ResourceAlreadyExistsException(authUser.email)
        }
      }

      // Create user
      // registrationId might be undefined, since this could be the old version
      const user = await this.userService.create({
        email: authUser?.email ?? null,
        authUserId: authUser?.uid ?? null,
        registrationId: registrationId ?? null,
        firstName,
        lastName,
        base64Photo,
        organizationIds: [organization.id],
      } as Omit<User, 'id'>)

      // Add user to group
      await this.organizationService.addUserToGroup(organization.id, group.id, user.id)

      // Add to registry
      await this.registrationService.linkUser(registrationId, user.id)

      res.json(actionSucceed({user, organization, group}))
    } catch (error) {
      next(error)
    }
  }

  disconnect = (req: Request, res: Response): void => {
    if (!Validation.validate(['key'], req, res)) {
      return
    }

    console.log(req.body.key)
    const response = {
      // data : {

      // },
      status: 'complete',
    }

    res.json(response)
  }

  connectedLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {userId} = req.body
      const user = await this.userService.findOne(userId)
      const organizations: Organization[] = await Promise.all(
        user.organizationIds
          .map((organizationId) => this.organizationService.findOneById(organizationId))
          .filter((org) => !!org),
      )
      res.json(actionSucceed(organizations))
    } catch (error) {
      next(error)
    }
  }

  getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId, userId} = req.params
      const {parentUserId} = req.query as {parentUserId?: string}
      let user: UserWithGroup | UserDependant
      let dependents: UserDependant[] = []
      let lookupIds: string[] = [userId]

      // Get appropriately Dependent vs User
      if (parentUserId) {
        // Get User
        const pickDependents = await this.userService.getAllDependants(parentUserId)
        user = pickDependents.filter((dependent) => dependent.id === userId)[0]
      } else {
        // Get User
        user = (await this.userService.findOne(userId)) as UserWithGroup

        // Get dependents only just under org
        dependents = (await this.userService.getAllDependants(userId)).filter((dep) =>
          dep.organizationIds?.includes(organizationId),
        )

        const dependentIds = dependents.map((dependent) => dependent.id)
        lookupIds = [...lookupIds, ...dependentIds]
      }

      if (!user) throw new ResourceNotFoundException(`Cannot find user with id [${userId}]`)

      // Fetch in chunks of 10 (most probably will only do once)
      const userGroupsArray: OrganizationUsersGroup[] = await Promise.all(
        _.chunk(lookupIds, 10).map((chunk) =>
          this.organizationService.getUsersGroups(organizationId, null, chunk),
        ),
      ).then((results) => _.flatten(results as OrganizationUsersGroup[][]))

      // Create a hashmap fo results
      const userGroups: Record<string, string> = userGroupsArray.reduce(function (map, obj) {
        map[obj.userId] = obj.groupId
        return map
      }, {})

      // Fill out user one
      // @ts-ignore creating a DTO
      user.groupId = userGroups[userId]
      for (const dependent of dependents) {
        // @ts-ignore creating a DTO
        dependent.groupId = userGroups[dependent.id]
      }

      res.json(actionSucceed({profile: user, dependents: dependents, parentUserId}))
    } catch (error) {
      next(error)
    }
  }

  userLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {userId} = req.params
      const {registrationId} = req.body

      // Add to user
      await this.userService.updateProperties(userId, {registrationId})

      // Add to registry
      await this.registrationService.linkUser(registrationId, userId)

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }

  userEdit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {userId} = req.params
      const userEditDetails = req.body as UserEdit

      let propertiesToUpdate = {
        firstName: userEditDetails.firstName,
        lastName: userEditDetails.lastName,
      }

      if (!!userEditDetails.base64Photo) {
        propertiesToUpdate = {...propertiesToUpdate, ...{base64Photo: userEditDetails.base64Photo}}
      }

      // Check if we are talking about a dependent or not
      if (!!userEditDetails.parentUserId) {
        await this.userService.updateDependantProperties(
          userEditDetails.parentUserId,
          userId,
          propertiesToUpdate,
        )
      } else {
        await this.userService.updateProperties(userId, propertiesToUpdate)
      }

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
