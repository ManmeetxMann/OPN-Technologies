import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {AppoinmentService} from '../../services/appoinment.service'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import {CreateAppointmentRequest} from '../../models/appointment'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import AdminController from "./admin/package.controller";

class AppointmentController implements IControllerBase {
  public path = '/reservation'
  public router = Router()
  private appointmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.post(
      this.path + '/api/v1/appointments',
      authorizationMiddleware([RequiredUserPermission.RegUser]),
      this.createAppointments,
    )

    this.router.use('/', innerRouter)
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
        addressForTesting,
        additionalAddressNotes,
        couponCode,
        shareTestResultWithEmployer,
        readTermsAndConditions,
        receiveResultsViaEmail,
        receiveNotificationsFromGov,
        vialLocation,
        appointmentIds,
      } = req.body as CreateAppointmentRequest
      await this.appointmentService.createAppointment({
        slotId,
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
        address,
        addressUnit,
        addressForTesting,
        additionalAddressNotes,
        couponCode,
        shareTestResultWithEmployer,
        readTermsAndConditions,
        receiveResultsViaEmail,
        receiveNotificationsFromGov,
        vialLocation,
        appointmentIds,
      })

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default AppointmentController
