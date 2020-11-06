import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {AppoinmentService} from '../services/appoinment.service'
import {ScheduleWebhookRequest} from "../models/webhook";

class WebhookController implements IControllerBase {
  public path = '/webhook'
  public router = Router()
  private appoinmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/acuity/schedule', this.handleScheduleWebhook)
  }

  handleScheduleWebhook = async (
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

export default WebhookController
