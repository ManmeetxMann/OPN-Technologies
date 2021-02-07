import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {AppoinmentService} from '../../services/appoinment.service'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import {CreateAppointmentRequest} from '../../models/appointment'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {getOrganizationId, getUserId} from '../../../../common/src/utils/auth'
import {AuthUser} from '../../../../common/src/data/user'

class AppointmentController implements IControllerBase {
  public path = '/reservation'
  public router = Router()
  private appointmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})

    const selfAuth = authorizationMiddleware([RequiredUserPermission.RegUser])

    innerRouter.get(this.path + '/api/v1/appointments/self', selfAuth, this.getUserAppointment)
    innerRouter.post(
      this.path + '/api/v1/appointments',
      authorizationMiddleware([RequiredUserPermission.RegUser]),
      this.createAppointments,
    )

    this.router.use('/', innerRouter)
  }

  getUserAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(res.locals.authenticatedUser)

      const result = await this.appointmentService.getAppointmentByUserId(userId)

      res.json(actionSucceed(result))
    } catch (error) {
      next(error)
    }
  }

  createAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        slotId,
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
        address,
        addressUnit,
        couponCode,
        shareTestResultWithEmployer,
        readTermsAndConditions,
        agreeToConductFHHealthAssessment,
        receiveResultsViaEmail,
        receiveNotificationsFromGov,
      } = req.body as CreateAppointmentRequest
      const authenticatedUser = res.locals.authenticatedUser as AuthUser
      const organizationId = getOrganizationId(authenticatedUser)
      const userId = getUserId(authenticatedUser)
      await this.appointmentService.createAcuityAppointment({
        organizationId,
        slotId,
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
        address,
        addressUnit,
        couponCode,
        shareTestResultWithEmployer,
        readTermsAndConditions,
        agreeToConductFHHealthAssessment,
        receiveResultsViaEmail,
        receiveNotificationsFromGov,
        userId,
      })

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default AppointmentController
