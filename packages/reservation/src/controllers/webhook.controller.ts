import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {AppoinmentService} from '../services/appoinment.service'
import {PackageService} from '../services/package.service'
import {ScheduleWebhookRequest} from '../models/webhook'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {isEmpty} from 'lodash'
import {AcuityUpdateDTO} from '../models/appointment'

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

      const appointment = await this.appoinmentService.getAppointmentByIdFromAcuity(id)

      if (!appointment) {
        throw new ResourceNotFoundException(`Appointmen with ${id} id not found`)
      }

      const dataForUpdate: AcuityUpdateDTO = {}

      if (!appointment.barCode) {
        dataForUpdate['barCodeNumber'] = await this.appoinmentService.getNextBarCodeNumber()
      }

      if (appointment.certificate && !appointment.organizationId) {
        const packageResult = await this.packageService.getByPackageCode(appointment.certificate)

        if (packageResult) {
          dataForUpdate['organizationId'] = packageResult.organizationId
        } else {
          console.log(
            `LegacyWebhookController: NoPackageToORGAssoc AppoinmentID: ${id} -  PackageCode: ${appointment.certificate}`,
          )
        }
      }

      if (!isEmpty(dataForUpdate)) {
        console.log(
          `LegacyWebhookController: SaveToAcuity AppoinmentID: ${id} barCodeNumber: ${JSON.stringify(
            dataForUpdate,
          )}`,
        )
        await this.appoinmentService.updateAppointment(id, dataForUpdate)
      } else {
        console.log(
          `LegacyWebhookController: NoUpdateToAcuity AppoinmentID: ${id} barCodeNumber: ${appointment.barCode}  organizationId: ${appointment.organizationId}`,
        )
      }

      res.json(actionSucceed(''))
    } catch (error) {
      next(error)
    }
  }
}

export default WebhookController
