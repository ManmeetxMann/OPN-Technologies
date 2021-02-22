import {NextFunction, Request, Response, Router} from 'express'
import {Lab} from '../../../models/lab'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {LabService} from '../../../services/lab.service'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'

class LabController implements IControllerBase {
  public path = '/reservation/admin'
  public router = Router()
  public labService = new LabService()

  constructor() {
    this.initRoutes()
  }

  initRoutes(): void {
    this.router.post(
      this.path + '/api/v1/labs',
      authorizationMiddleware([RequiredUserPermission.OrgAdmin]),
      this.addLab,
    )
  }

  addLab = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {name} = req.body as Lab
      if (!name) {
        throw new BadRequestException('Param "name" not found')
      }
      const result = await this.labService.save({name})
      res.json(actionSucceed(result))
    } catch (error) {
      next(error)
    }
  }
}

export default LabController
