import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {authMiddleware} from '../../../../common/src/middlewares/auth'

import {AppointmentByOrganizationRequest} from '../../models/appoinment'
import {AppoinmentService} from '../../services/appoinment.service'

class AdminAppointmentController implements IControllerBase {
  public path = '/reservation/admin'
  public router = Router()
  private appoinmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.get(this.path + '/api/v1/appointments', authMiddleware, this.getListAppointments)

    this.router.use('/', innerRouter)
  }

  getListAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId, searchQuery} = req.query as AppointmentByOrganizationRequest

      const appointment = await this.appoinmentService.getAppointmentByOrganizationIdAndSearchParams(
        organizationId,
        searchQuery,
      )

      res.json(actionSucceed(appointment))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminAppointmentController
