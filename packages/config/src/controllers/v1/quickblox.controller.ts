import {NextFunction, Request, Response, Router} from 'express'
import {Config} from '../../../../common/src/utils/config'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'

class QuickbloxController implements IControllerBase {
  public path = '/config/api/v1'
  public router = Router()
  constructor() {
    this.initRoutes()
  }

  initRoutes(): void {
    this.router.get(
      this.path + '/quickblox',
      authorizationMiddleware([RequiredUserPermission.RegUser]),
      this.getquickblox,
    )
  }

  getquickblox = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const provider_id = Config.get('QUICKBLOX_PROVIDER_ID')

      res.json(actionSucceed({provider_id}))
    } catch (error) {
      next(error)
    }
  }
}

export default QuickbloxController
