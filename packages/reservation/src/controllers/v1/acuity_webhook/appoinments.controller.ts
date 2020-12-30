import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {AppoinmentService} from '../../../services/appoinment.service'
import {PackageService} from '../../../services/package.service'
import {ScheduleWebhookRequest} from '../../../models/webhook'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {DuplicateDataException} from '../../../../../common/src/exceptions/duplicate-data-exception'
import {isEmpty} from 'lodash'
import {AppointmentStatus, AppointmentUI, Result, AcuityUpdateDTO} from '../../../models/appoinment'
import {TestResultsService} from '../../../services/test-results.service'
import moment from 'moment'
import {dateFormats, timeFormats} from '../../../../../common/src/utils/times'

class AppointmentWebhookController implements IControllerBase {
  public path = '/reservation/acuity_webhook/api/v1/appointment'
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
      let deadline: string
      const utcDateTime = moment(appointment.dateTime).utc()

      const dateTime = utcDateTime.format()
      const dateOfAppointment = utcDateTime.format(dateFormats.longMonth)
      const timeOfAppointment = utcDateTime.format(timeFormats.standard12h)

      if (utcDateTime.hours() > 12) {
        deadline = this.appoinmentService.makeTimeEndOfTheDay(utcDateTime.add(1, 'd'))
      } else {
        deadline = this.appoinmentService.makeTimeEndOfTheDay(utcDateTime)
      }

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
          throw new DuplicateDataException(`Duplicate ${id} found, Barcode ${appointment.barCode}`)
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
        const {id, appointmentId, ...insertingAppointment} = appointment as AppointmentUI
        const {barCodeNumber, organizationId} = dataForUpdate
        await this.appoinmentService.saveAppointmentData({
          ...insertingAppointment,
          organizationId: appointment.organizationId || organizationId || null,
          barCode: appointment.barCode || barCodeNumber,
          acuityAppointmentId: id,
          appointmentStatus: AppointmentStatus.pending,
          result: Result.pending,
          dateTime,
          dateOfAppointment,
          timeOfAppointment,
          deadline,
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
