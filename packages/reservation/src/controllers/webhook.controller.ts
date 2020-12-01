import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {AppoinmentService} from '../services/appoinment.service'
import {PackageService} from '../services/package.service'
import {ScheduleWebhookRequest} from '../models/webhook'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'

class WebhookController implements IControllerBase {
  public path = '/webhook'
  public router = Router()
  private appoinmentService = new AppoinmentService()
  private packageService = new PackageService()

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

      const appointment = await this.appoinmentService.getAppointmentById(id)
      if (!appointment) {
        throw new ResourceNotFoundException(`Appointmen with ${id} id not found`)
      }

      const dataForUpdate = {}

      if (appointment.barCode) {
        dataForUpdate['barCodeNumber'] = appointment.barCode || appointment['barCodeNumber']
      }

      if (appointment.certificate) {
        const packageResult = await this.packageService.getByPackageCode(appointment.certificate)

        if (packageResult) {
          dataForUpdate['organizationId'] = packageResult.organizationId
        }
      }

      await this.appoinmentService.updateAppoinment(id, dataForUpdate)

      res.json(actionSucceed(''))
    } catch (error) {
      next(error)
    }
  }
}

export default WebhookController
