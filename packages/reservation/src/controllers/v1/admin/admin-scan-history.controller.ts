import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {AppoinmentService} from '../../../services/appoinment.service'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {getIsLabUser, getUserId} from '../../../../../common/src/utils/auth'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {
  AppointmentStatus,
  appointmentUiDTOResponse,
  GetAdminScanHistoryRequest,
  PostAdminScanHistoryRequest,
} from '../../../models/appointment'
import {ForbiddenException} from '../../../../../common/src/exceptions/forbidden-exception'
import {PCRTestResultsService} from '../../../services/pcr-test-results.service'

class AdminScanHistoryController implements IControllerBase {
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

    innerRouter.get(this.path + '/admin-scan-history', adminWithAppointments, this.getByHistory)
    innerRouter.post(
      this.path + '/admin-scan-history',
      adminWithAppointments,
      this.createScanHistory,
    )
    innerRouter.delete(
      this.path + '/admin-scan-history',
      adminWithAppointments,
      this.deleteScanHistory,
    )

    this.router.use('/', innerRouter)
  }

  createScanHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {barCode, type, organizationId} = req.body as PostAdminScanHistoryRequest
      const adminId = getUserId(res.locals.authenticatedUser)
      const isLabUser = getIsLabUser(res.locals.authenticatedUser)

      let appointment = await this.appointmentService.getAppointmentByBarCode(barCode)
      const pcrTest = await this.pcrTestResultsService.getWaitingPCRResultByAppointmentId(
        appointment.id,
      )

      if (appointment.organizationId !== organizationId) {
        console.log(appointment.id, appointment.organizationId, organizationId)
        throw new ForbiddenException('Appointment does not belong to your organization')
      }

      await this.appointmentService.makeDeadline15Minutes(appointment, pcrTest.id)

      await this.appointmentService.addAdminScanHistory(adminId, appointment.id, type)
      if (appointment.appointmentStatus !== AppointmentStatus.Reported) {
        await this.appointmentService.makeDeadline15Minutes(appointment)
        appointment = await this.appointmentService.makeInProgress(appointment.id, null, adminId)
      }

      res.json(
        actionSucceed({
          ...appointmentUiDTOResponse(appointment, isLabUser),
        }),
      )
    } catch (error) {
      next(error)
    }
  }

  deleteScanHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {type} = req.query as GetAdminScanHistoryRequest
      const adminId = getUserId(res.locals.authenticatedUser)

      await this.appointmentService.deleteScanHistory(adminId, type)

      res.json(actionSucceed())
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

export default AdminScanHistoryController
