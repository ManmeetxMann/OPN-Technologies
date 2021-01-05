import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {AppoinmentService} from '../../../services/appoinment.service'
import {PackageService} from '../../../services/package.service'
import {ScheduleWebhookRequest} from '../../../models/webhook'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {isEmpty} from 'lodash'
import {AppointmentStatus, AppointmentBase, AcuityUpdateDTO, ResultTypes} from '../../../models/appointment'
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
    this.router.post(this.path + '/create', this.handleCreateAppointment)
  }

  handleCreateAppointment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {id} = req.body as ScheduleWebhookRequest

      const appointment = await this.appoinmentService.getAppointmentByIdFromAcuity(id)

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
        const blockDuplicate = true
        await this.appoinmentService.getAppointmentByBarCode(
          appointment.barCode,
          blockDuplicate
        )
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
        const {
          acuityAppointmentId,
          ...insertingAppointment
        } = appointment as AppointmentBase
        const {barCodeNumber, organizationId} = dataForUpdate
        const data = {
          ...insertingAppointment,
          organizationId: appointment.organizationId || organizationId || null,
          barCode: appointment.barCode || barCodeNumber,
          acuityAppointmentId: acuityAppointmentId,
          appointmentStatus: AppointmentStatus.pending,
          result: ResultTypes.Pending,
          dateTime,
          dateOfAppointment,
          timeOfAppointment,
          deadline,
        }
        await this.appoinmentService.saveAppointmentData(data)
      } catch (e) {
        console.log(
          `WebhookController: SaveToTestResults Failed AppoinmentID: ${id}`,
        )
        console.log(e)
      }

      res.json(actionSucceed(''))
    } catch (error) {
      next(error)
    }
  }
}

export default AppointmentWebhookController
