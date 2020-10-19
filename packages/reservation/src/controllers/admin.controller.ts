import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'

import {AppoinmentService} from '../services/appoinment.service'
import { TestResultsDTO } from '../models/appoinment'

class AdminController implements IControllerBase {
  public path = '/admin'
  public router = Router()
  private appoinmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/api/v1/appointment', this.getAppointmentByBarCode)
    this.router.post(this.path + '/api/v1/test_results', this.saveAndSendTestResults)
  }

  getAppointmentByBarCode = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {barCodeNumber} = req.body

      const appointment = await this.appoinmentService.getAppoinmentByBarCode(barCodeNumber)

      res.json(actionSucceed(appointment))
    } catch (error) {
      next(error)
    }
  }

  saveAndSendTestResults = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const requestData:TestResultsDTO = req.body

      const appointment = await this.appoinmentService.saveAndSendTestResults(requestData)

      res.json(actionSucceed(appointment))
    } catch (error) {
      next(error)
    }
  }

}

export default AdminController
