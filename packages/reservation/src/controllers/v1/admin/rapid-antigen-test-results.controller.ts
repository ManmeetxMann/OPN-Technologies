import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'

class AdminRapidAntigenTestTesultsController implements IControllerBase {
  public path = '/reservation/admin/api/v1'
  public router = Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    const sendBulkResultsAuth = authorizationMiddleware([RequiredUserPermission.LabSendBulkResults])

    innerRouter.post(
      this.path + '/rapid-antigen-test-results',
      sendBulkResultsAuth,
      this.saveRapidAntigenTestTesults,
    )
    this.router.use('/', innerRouter)
  }

  saveRapidAntigenTestTesults = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      res.json(actionSucceed({}))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminRapidAntigenTestTesultsController
