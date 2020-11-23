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
        .delete('/:userId/dependants', this.removeDependants)
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
        dependants: (UserDependant & {groupId: string})[]
      }
      const added = await this.userService.addDependants(userId, dependants)

      await Promise.all(
        added.map((member, index) =>
          this.organizationService.addUserToGroup(
            organizationId,
            dependants[index].groupId,
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
      await this.userService.removeDependant(userId, dependantId)
      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }

  removeDependants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params['userId']
      const {organizationId, dependants} = req.body as {
        organizationId: string
        dependants: UserDependant[]
      }
      await Promise.all(
        dependants.map((dependant) =>
          this.userService
            .removeDependant(userId, dependant.id)
            .then(() =>
              this.organizationService.removeUserFromAllGroups(organizationId, null, dependant.id),
            ),
        ),
      )

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
