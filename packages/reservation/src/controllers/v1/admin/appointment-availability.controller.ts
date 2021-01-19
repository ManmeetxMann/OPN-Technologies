import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'

import {AppoinmentService} from '../../../services/appoinment.service'

class AppointmentAvailabilityController implements IControllerBase {
  public path = '/reservation/admin/api/v1/availability'
  public router = Router()
  private appointmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})

    innerRouter.get(
      this.path + '/slots',
      authorizationMiddleware([RequiredUserPermission.RegUser]),
      this.getAvailableSlots,
    )

    this.router.use('/', innerRouter)
  }

  getAvailableSlots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {id, date} = req.query as {id: string; date: string}

      const availableSlots = await this.appointmentService.getAvailableSlots(id, date)

      res.json(actionSucceed(availableSlots))
    } catch (error) {
      next(error)
    }
  }
}

export default AppointmentAvailabilityController
