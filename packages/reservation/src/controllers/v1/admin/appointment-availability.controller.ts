import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'

import {AppoinmentService} from '../../../services/appoinment.service'

class AdminAppointmentAvailabilityController implements IControllerBase {
  public path = '/reservation/admin/api/v1/availability'
  public router = Router()
  private appointmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    const apptLabOrOrgAdminAuthWithOrg = authorizationMiddleware(
      [RequiredUserPermission.LabOrOrgAppointments],
      true,
    )
    innerRouter.get(
      this.path + '/times-by-appointment-id',
      apptLabOrOrgAdminAuthWithOrg,
      this.getAvailableTimes,
    )
    innerRouter.get(
      this.path + '/dates-by-appointment-id',
      apptLabOrOrgAdminAuthWithOrg,
      this.getAvailableDates,
    )
    this.router.use('/', innerRouter)
  }

  getAvailableTimes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {appointmentId, date} = req.query as {
        appointmentId: string
        date: string
      }
      const availableSlots = await this.appointmentService.getAvailableTimes(appointmentId, date)
      res.json(actionSucceed(availableSlots))
    } catch (error) {
      next(error)
    }
  }

  getAvailableDates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {year, month, appointmentId} = req.query as {
        year: string
        month: string
        appointmentId: string
      }
      const response = await this.appointmentService.getAvailableDates(appointmentId, year, month)
      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminAppointmentAvailabilityController
