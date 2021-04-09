import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {LabService} from '../../../services/lab.service'
import {getUserId} from '../../../../../common/src/utils/auth'

class AdminLabController implements IControllerBase {
  public path = '/reservation/admin'
  public router = Router()
  public labService = new LabService()

  constructor() {
    this.initRoutes()
  }

  initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.post(
      this.path + '/api/v1/labs',
      authorizationMiddleware([RequiredUserPermission.OrgAdmin]),
      this.addLab,
    )

    innerRouter.get(
      this.path + '/api/v1/labs',
      authorizationMiddleware([RequiredUserPermission.OrgAdmin]),
      this.getLabs,
    )

    this.router.use('/', innerRouter)
  }

  addLab = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {name, templateId, assay} = req.body as {
        name: string
        templateId: string
        assay: string
      }

      const createdBy = getUserId(res.locals.authenticatedUser)
      const result = await this.labService.save({name, templateId, assay, createdBy})

      res.json(actionSucceed(result))
    } catch (error) {
      next(error)
    }
  }

  getLabs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const labs = await this.labService.getAll()
      res.json(actionSucceed(labs))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminLabController
