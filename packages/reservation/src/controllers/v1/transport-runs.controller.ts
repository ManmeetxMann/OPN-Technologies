import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {Handler, Router} from 'express'
import {adminAuthMiddleware} from '../../../../common/src/middlewares/admin.auth'
import {TransportRunsService} from '../../services/transport-runs.service'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'

class TransportRunsController implements IControllerBase {
  public path = '/reservation/admin/api/v1/transport-runs'
  public router = Router()
  private transportRunsService = new TransportRunsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.post(this.path + '/', adminAuthMiddleware, this.createTransportRun)

    this.router.use('/', innerRouter)
  }

  createTransportRun: Handler = async (req, res, next): Promise<void> => {
    try {
      const {transportDateTime, driverName} = req.body as {
        transportDateTime: string
        driverName: string
      }

      const transportRun = await this.transportRunsService.create(transportDateTime, driverName)

      res.json(
        actionSucceed({
          transportRunId: transportRun.id,
        }),
      )
    } catch (error) {
      console.log(error)
      next(error)
    }
  }
}

export default TransportRunsController
