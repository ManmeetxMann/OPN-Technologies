import {NextFunction, Request, Response, Router} from 'express'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import IRouteController from '../../../../common/src/interfaces/IRouteController.interface'
import {UserService} from '../../../../common/src/service/user/user-service'
import {UserDependant} from '../../../../common/src/data/user'
import {OrganizationService} from '../../../../enterprise/src/services/organization-service'

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

  getAllDependants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params['userId']
      const members = await this.userService.getAllDependants(userId)
      res.json(actionSucceed(members))
    } catch (error) {
      next(error)
    }
  }

  addDependants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params['userId']
      const {organizationId, dependants} = req.body as {
        organizationId: string
        dependants: UserDependant[]
      }
      const added = await this.userService.addDependants(userId, dependants)

      await Promise.all(
        added.map((member) =>
          this.organizationService.addUserToGroup(
            organizationId,
            member.groupId,
            member.id,
            userId,
          ),
        ),
      )

      res.json(actionSucceed(added))
    } catch (error) {
      next(error)
    }
  }

  removeDependant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params['userId']
      const dependantId = req.params['dependantId']
      const organizationId = req.query['organizationId'] as string
      const {groupId} = await this.userService.findOneDependant(userId, dependantId)

      await this.userService
        .removeDependant(userId, dependantId)
        .then(() => this.organizationService.removeUserFromGroup(organizationId, groupId, userId))
      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
