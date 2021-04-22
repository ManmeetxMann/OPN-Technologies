import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import * as express from 'express'
import {UserService} from '../../../../common/src/service/user/user-service'
import {resultAdminsDTO} from '../../types/result-admins'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {NextFunction, Request, Response} from 'express'

class UserController implements IControllerBase {
  public path = '/enterprise/api/v1/users'
  public router = express.Router()
  private userService = new UserService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.get(this.path + '/result-admins', this.fetchAdmins)
  }

  private fetchAdmins = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const labId = req.headers?.labid as string
      const admins = await this.userService.getAll(labId)
      res.json(actionSucceed(resultAdminsDTO(admins)))
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
