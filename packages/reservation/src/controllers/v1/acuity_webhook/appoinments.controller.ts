import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {AppoinmentService} from '../../../services/appoinment.service'
import {PackageService} from '../../../services/package.service'
import {ScheduleWebhookRequest} from '../../../models/webhook'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {isEmpty} from 'lodash'
import {AcuityUpdateDTO, AppointmentStatus, AppointmentUI, Result} from '../../../models/appoinment'
import {TestResultsService} from '../../../services/test-results.service'

class AppointmentWebhookController implements IControllerBase {
  public path = '/api/v1/appointment'
  public router = Router()
  private appoinmentService = new AppoinmentService()
  private packageService = new PackageService()
  private testResultsService = new TestResultsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/create', this.handleScheduleWebhook)
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
        throw new ResourceNotFoundException(`Appointment with ${id} id not found`)
      }

      const dataForUpdate: AcuityUpdateDTO = {}

      if (!appointment.barCode) {
        dataForUpdate['barCodeNumber'] = await this.appoinmentService.getNextBarCodeNumber()
      } else {
        const appointmentWithSameBarcodes = await this.appoinmentService.getAppoinmentDBByBarCode(
          appointment.barCode,
        )
        if (appointmentWithSameBarcodes.length > 0) {
          console.log(
            `WebhookController: DuplicateBarCode AppoinmentID: ${id} -  BarCode: ${appointment.barCode}`,
          )
        }
      }

      if (appointment.packageCode && !appointment.organizationId) {
        const packageResult = await this.packageService.getByPackageCode(appointment.packageCode)

        if (packageResult) {
          dataForUpdate['organizationId'] = packageResult.organizationId
        } else {
          console.log(
            `WebhookController: NoPackageToORGAssoc AppoinmentID: ${id} -  PackageCode: ${appointment.packageCode}`,
          )
        }
      }

      if (!isEmpty(dataForUpdate)) {
        console.log(
          `WebhookController: SaveToAcuity AppoinmentID: ${id} barCodeNumber: ${JSON.stringify(
            dataForUpdate,
          )}`,
        )
        await this.appoinmentService.updateAppointment(id, dataForUpdate)
      } else {
        console.log(
          `WebhookController: NoUpdateToAcuity AppoinmentID: ${id} barCodeNumber: ${appointment.barCode}  organizationId: ${appointment.organizationId}`,
        )
      }

      try {
        const {id, ...insertingAppointment} = appointment as AppointmentUI
        await this.appoinmentService.saveAppointmentData({
          ...insertingAppointment,
          acuityAppointmentId: id,
          barCode: appointment.barCode,
          appointmentStatus: AppointmentStatus.pending,
          result: Result.pending,
        })
      } catch (e) {
        console.log(
          `WebhookController: SaveToTestResults Failed AppoinmentID: ${id} barCodeNumber: ${JSON.stringify(
            dataForUpdate,
          )}`,
        )
      }

      res.json(actionSucceed(''))
    } catch (error) {
      next(error)
    }
  }
}

export default AppointmentWebhookController
