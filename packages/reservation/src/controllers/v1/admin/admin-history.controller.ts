import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {AppoinmentService} from '../../../services/appoinment.service'
import {PCRTestResultsService} from '../../../services/pcr-test-results.service'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {getIsLabUser, getUserId} from '../../../../../common/src/utils/auth'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {
  appointmentUiDTOResponse,
  GetAdminScanHistoryRequest,
  PostAdminScanHistoryRequest,
} from '../../../models/appointment'

class AdminHistoryController implements IControllerBase {
  public path = '/reservation/admin/api/v1'
  public router = Router()
  private appointmentService = new AppoinmentService()
  private pcrTestResultsService = new PCRTestResultsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})

    const adminWithAppointments = authorizationMiddleware([RequiredUserPermission.AdminScanHistory])

    innerRouter.post(this.path + '/admin-scan-history', adminWithAppointments, this.getByBarcode)
    innerRouter.get(this.path + '/admin-scan-history', adminWithAppointments, this.getByHistory)

    this.router.use('/', innerRouter)
  }

  getByBarcode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {barCode, type} = req.body as PostAdminScanHistoryRequest
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

  getByHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {type} = req.query as GetAdminScanHistoryRequest
      const adminId = getUserId(res.locals.authenticatedUser)
      const isLabUser = getIsLabUser(res.locals.authenticatedUser)

      const appointments = await this.appointmentService.getAppointmentByHistory(adminId, type)

      res.json(
        actionSucceed(
          appointments.map((appointment) => ({
            ...appointmentUiDTOResponse(appointment, isLabUser),
          })),
        ),
      )
    } catch (error) {
      next(error)
    }
  }
}

export default AdminHistoryController
