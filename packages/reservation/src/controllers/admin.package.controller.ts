import {NextFunction, Request, Response, Router} from 'express'

import packageValidations from '../validations/package.validations'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {AppoinmentService} from '../services/appoinment.service'
import {TestResultsService} from '../services/test-results.service'
import {ScheduleWebhookRequest} from '../models/webhook'

class AdminPackageController implements IControllerBase {
  public path = '/packages'
  public router = Router()
  private appoinmentService = new AppoinmentService()
  private testResultsService = new TestResultsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(
      this.path + '/',
      packageValidations.packageValidation,
      this.addPackageCode
    )
  }

  addPackageCode = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {id} = req.body as ScheduleWebhookRequest

      const newBarcode = await this.appoinmentService.getNextBarCodeNumber()

      await this.appoinmentService.addBarcodeAppointment(id, newBarcode)

      res.json(actionSucceed(''))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminPackageController
