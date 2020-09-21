import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

import Validation from '../../../common/src/utils/validation'
import {OrganizationService} from '../services/organization-service'
import {OrganizationConnectionRequest} from '../models/organization-connection-request'
import {UserService} from '../../../common/src/service/user/user-service'
import {User, UserEdit, UserWithGroup} from '../../../common/src/data/user'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {Organization, OrganizationUsersGroup} from '../models/organization'

class UserController implements IControllerBase {
  public path = '/user'
  public router = express.Router()
  private organizationService = new OrganizationService()
  private userService = new UserService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/connect/add', this.connect)
    this.router.post(this.path + '/connect/remove', this.disconnect)
    this.router.post(this.path + '/connect/locations', this.connectedLocations)
    this.router.put(this.path + '/connect/edit/:userId', this.userEdit)
    this.router.get(this.path + '/connect/:organizationId/users/:userId', this.getUser)
  }

  // Note: Doesn't handle multiple organizations per user as well as checking an existing connection
  connect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {responses, ...body} = req.body
      body as OrganizationConnectionRequest
      responses as string[]
      const {organizationId, firstName, lastName, base64Photo, groupId} = body
      const organization = await this.organizationService.findOneById(organizationId)
      const group = await this.organizationService.getGroup(organization.id, groupId)

      // Create user
      const user = await this.userService.create({
        firstName,
        lastName,
        base64Photo,
        organizationIds: [organization.id],
      } as User)

      // Add user to group
      await this.organizationService.addUserToGroup(organization.id, group.id, user.id)

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
      const user = (await this.userService.findOne(userId)) as UserWithGroup
      const dependents = await this.userService.getAllDependants(userId)
      const dependentIds = dependents.map((dependent) => dependent.id)

      const userGroups = await this.organizationService.getUsersGroups(organizationId, null, [
        user.id,
        ...dependentIds,
      ])

      // Fill out user one
      user.groupId = this.getGroupId(user.id, userGroups)
      for (const dependent of dependents) {
        dependent.groupId = this.getGroupId(dependent.id, userGroups)
      }

      res.json(actionSucceed({profile: user, dependents: dependents}))
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

  private getGroupId = (userId: string, userGroups: OrganizationUsersGroup[]): string => {
    for (const userGroup of userGroups) {
      if (userGroup.userId === userId) return userGroup.groupId
    }
    return null
  }
}

export default UserController
