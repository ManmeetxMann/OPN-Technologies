import {NextFunction, Request, Response, Router} from 'express'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import IRouteController from '../../../../common/src/interfaces/IRouteController.interface'
import {UserService} from '../../../../common/src/service/user/user-service'
import {LegacyDependant, User} from '../../../../common/src/data/user'
import {OrganizationService} from '../../../../enterprise/src/services/organization-service'

import * as _ from 'lodash'
class UserController implements IRouteController {
  public router = Router()
  private userService = new UserService()
  private organizationService = new OrganizationService()

  constructor() {
    this.initRoutes()
  }

  initRoutes(): void {
    this.router.use(
      '/v2/users',
      Router()
        .get('/:userId/dependants', this.getAllDependants)
        .post('/:userId/dependants', this.addDependants)
        .delete('/:userId/dependants/:dependantId', this.removeDependant),
    )
  }

  // TODO: make this org-specific
  getAllDependants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params['userId']
      const [user, dependants] = await Promise.all([
        this.userService.findOne(userId),
        this.userService.getAllDependants(userId),
      ])
      const allGroups = _.flatten(
        await Promise.all(
          (user.organizationIds ?? []).map((orgId) =>
            this.organizationService.getDependantGroups(orgId, userId),
          ),
        ),
      )

      const legacyDependants = dependants.map((dep) => ({
        firstName: dep.firstName,
        lastName: dep.lastName,
        id: dep.id,
        groupId: allGroups.find((membership) => membership.userId === dep.id)?.groupId,
      }))

      res.json(actionSucceed(legacyDependants))
    } catch (error) {
      next(error)
    }
  }

  // TODO: update API to not use LegacyDependant
  addDependants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params['userId']
      const {organizationId, dependants} = req.body as {
        organizationId: string
        dependants: LegacyDependant[]
      }

      const [existingGroups, existingDependants, added] = await Promise.all([
        this.organizationService.getDependantGroups(organizationId, userId),
        this.userService.getAllDependants(userId),
        this.userService.addDependants(userId, dependants, organizationId),
      ])

      const dependantsForOrg: User[] = existingDependants.filter((dependant) =>
        existingGroups.find((membership) => membership.userId === dependant.id) ? true : false,
      )

      const legacyExisting: LegacyDependant[] = dependantsForOrg.map((dep) => ({
        firstName: dep.firstName,
        lastName: dep.lastName,
        id: dep.id,
        groupId: existingGroups.find((membership) => membership.userId === dep.id)?.groupId,
      }))

      const legacyAdded: LegacyDependant[] = added.map((dep, index) => ({
        firstName: dep.firstName,
        lastName: dep.lastName,
        id: dep.id,
        groupId: dependants[index].groupId,
      }))

      await Promise.all(
        legacyAdded.map((member) =>
          this.organizationService.addUserToGroup(
            organizationId,
            member.groupId,
            member.id,
            userId,
          ),
        ),
      )

      res.json(actionSucceed([...legacyExisting, ...legacyAdded]))
    } catch (error) {
      next(error)
    }
  }

  removeDependant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params['userId']
      const dependantId = req.params['dependantId']
      await this.userService.removeDependant(userId, dependantId)
      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
