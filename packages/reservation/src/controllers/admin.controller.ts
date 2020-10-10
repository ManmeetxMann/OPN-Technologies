import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'

import {AppoinmentService} from '../services/appoinment.service'

class AdminController implements IControllerBase {
  public path = '/admin'
  public router = Router()
  private appoinmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(
      this.path + '/appointments/search',
      this.searchAppoinmentsForPhoneAndAppoinmentDate,
    )
  }

  searchAppoinmentsForPhoneAndAppoinmentDate = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {phoneNumber, dateOfAppointment} = req.body

      const appointmentList = await this.appoinmentService.searchAppoinmentsForPhoneAndAppoinmentDate(
        phoneNumber,
        dateOfAppointment,
      )

      res.json(actionSucceed(appointmentList))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController
