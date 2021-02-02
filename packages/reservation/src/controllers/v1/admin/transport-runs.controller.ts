import {Handler, Router} from 'express'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'

import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'

import {TransportRunsService} from '../../../services/transport-runs.service'
import {TransportRunsDTOResponse} from '../../../models/transport-runs'

class TransportRunsController implements IControllerBase {
  public path = '/reservation/admin/api/v1/transport-runs'
  public router = Router()
  private transportRunsService = new TransportRunsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.get(
      this.path + '/',
      authorizationMiddleware([
        RequiredUserPermission.LabTransportRuns,
        RequiredUserPermission.LabAddTransportRunsToAppointments,
      ]),
      this.listTransportRun,
    )
    innerRouter.post(
      this.path + '/',
      authorizationMiddleware([RequiredUserPermission.LabTransportRuns]),
      this.createTransportRun,
    )

    this.router.use('/', innerRouter)
  }

  createTransportRun: Handler = async (req, res, next): Promise<void> => {
    try {
      const {transportDateTime, driverName} = req.body as {
        transportDateTime: string
        driverName: string
      }

      const transportRun = await this.transportRunsService.create(
        new Date(transportDateTime),
        driverName,
      )

      res.json(
        actionSucceed({
          transportRunId: transportRun.id,
        }),
      )
    } catch (error) {
      next(error)
    }
  }

  listTransportRun: Handler = async (req, res, next): Promise<void> => {
    try {
      const {transportDate} = req.query as {transportDate: string}

      const transportRuns = await this.transportRunsService.getByDate(transportDate)

      res.json(actionSucceed(transportRuns.map(TransportRunsDTOResponse)))
    } catch (error) {
      next(error)
    }
  }
}

export default TransportRunsController
