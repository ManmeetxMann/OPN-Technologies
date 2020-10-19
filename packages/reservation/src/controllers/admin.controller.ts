import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'

import {AppoinmentService} from '../services/appoinment.service'
import {TestResultsService} from '../services/test-results.service'
import {TestResultsDTO} from '../models/appoinment'

class AdminController implements IControllerBase {
  public path = '/admin'
  public router = Router()
  private appoinmentService = new AppoinmentService()
  private testResultsService = new TestResultsService()

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
      const requestData: TestResultsDTO = req.body
      this.appoinmentService
        .getAppoinmentByBarCode(requestData.barCode)
        .then((appointment) =>
          this.testResultsService.sendTestResults({...requestData, ...appointment}),
        )

      res.json(actionSucceed({}))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController
