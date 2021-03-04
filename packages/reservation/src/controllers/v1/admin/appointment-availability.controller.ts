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
    this.router.use('/', innerRouter)
  }

  getAvailableTimes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {calendarId, appointmentTypeId, date} = req.query as {
        calendarId: string
        appointmentTypeId: string
        date: string
      }
      const availableSlots = await this.appointmentService.getAvailableTimes(
        appointmentTypeId,
        calendarId,
        date,
      )
      res.json(actionSucceed(availableSlots))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminAppointmentAvailabilityController
