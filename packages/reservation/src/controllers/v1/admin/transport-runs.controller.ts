import {Handler, Router} from 'express'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'

import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'

import {TransportRunsService} from '../../../services/transport-runs.service'
import {LabService} from '../../../services/lab.service'
import {TransportRunsDTOResponse} from '../../../models/transport-runs'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {getIsClinicUser, getUserId} from '../../../../../common/src/utils/auth'

class AdminTransportRunsController implements IControllerBase {
  public path = '/reservation/admin/api/v1/transport-runs'
  public router = Router()
  private transportRunsService = new TransportRunsService()
  private labService = new LabService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.get(
      this.path + '/',
      authorizationMiddleware([RequiredUserPermission.LabTransportRunsList]),
      this.listTransportRun,
    )
    innerRouter.post(
      this.path + '/',
      authorizationMiddleware([RequiredUserPermission.LabTransportRunsCreate]),
      this.createTransportRun,
    )

    this.router.use('/', innerRouter)
  }

  createTransportRun: Handler = async (req, res, next): Promise<void> => {
    try {
      const {transportDateTime, driverName, label, labId} = req.body as {
        transportDateTime: string
        driverName: string
        label: string
        labId: string
      }
      const isClinicUser = getIsClinicUser(res.locals.authenticatedUser)
      const createdBy = getUserId(res.locals.authenticatedUser)
      const {admin} = res.locals.authenticatedUser

      const isAdminForLab = admin.adminForLabIds && admin.adminForLabIds.includes(labId)
      if (!isAdminForLab && !isClinicUser) {
        throw new ResourceNotFoundException(
          `No permission to add labId [${labId}] to transport run`,
        )
      }

      const checkIfLabExists = await this.labService.findOneById(labId)
      if (!checkIfLabExists) {
        throw new ResourceNotFoundException(`No lab found for this id ${labId}`)
      }

      const transportRun = await this.transportRunsService.create(
        new Date(transportDateTime),
        driverName,
        label,
        labId,
        createdBy,
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
      const labId = req.headers?.labid as string

      const transportRuns = await this.transportRunsService.getByDate(transportDate, labId)

      res.json(actionSucceed(transportRuns.map(TransportRunsDTOResponse)))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminTransportRunsController
