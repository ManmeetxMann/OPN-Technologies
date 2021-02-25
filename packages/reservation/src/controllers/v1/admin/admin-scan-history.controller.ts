import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {AppoinmentService} from '../../../services/appoinment.service'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {getIsLabUser, getUserId} from '../../../../../common/src/utils/auth'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {appointmentUiDTOResponse, GetAdminScanHistoryRequest} from '../../../models/appointment'

class AdminScanHistoryController implements IControllerBase {
  public path = '/reservation/admin/api/v1'
  public router = Router()
  private appointmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})

    const adminWithAppointments = authorizationMiddleware([RequiredUserPermission.AdminScanHistory])

    innerRouter.post(this.path + '/admin-scan-history', adminWithAppointments, this.createScanHistory)

    this.router.use('/', innerRouter)
  }

  createScanHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {barCode, type} = req.body as GetAdminScanHistoryRequest
      const adminId = getUserId(res.locals.authenticatedUser)
      const isLabUser = getIsLabUser(res.locals.authenticatedUser)

      const appointment = await this.appointmentService.getAppointmentByBarCode(barCode)

      await this.appointmentService.makeDeadline15Minutes(appointment)
      await this.appointmentService.addAdminScanHistory(adminId, appointment.id, type)
      await this.appointmentService.makeInProgress(appointment.id, null, adminId)

      res.json(
        actionSucceed({
          ...appointmentUiDTOResponse(appointment, isLabUser),
        }),
      )
    } catch (error) {
      next(error)
    }
  }
}

export default AdminScanHistoryController
