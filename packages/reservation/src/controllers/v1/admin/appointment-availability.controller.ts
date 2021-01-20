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
      this.path + '/dates',
      authorizationMiddleware([RequiredUserPermission.RegUser]),
      this.getAvailabilityDateList,
    )

    this.router.use('/', innerRouter)
  }

  getAvailabilityDateList = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {year, month, id} = req.query as {year: string; month: string; id: string}

      const availableDates = await this.appointmentService.getAvailabitlityDateList(
        id,
        Number(year),
        Number(month),
      )

      res.json(actionSucceed(availableDates.map(({date}) => ({date}))))
    } catch (error) {
      next(error)
    }
  }
}

export default AppointmentAvailabilityController
