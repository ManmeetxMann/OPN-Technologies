import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import {getUserId} from '../../../../common/src/utils/auth'

import {AppoinmentService} from '../../services/appoinment.service'

class AppointmentController implements IControllerBase {
  public path = '/reservation/api/v1/appointments'
  public router = Router()
  private appointmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})

    const selfAuth = authorizationMiddleware([RequiredUserPermission.RegUser])

    innerRouter.get(this.path + '/self', selfAuth, this.getUserAppointment)

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
}

export default AppointmentController
