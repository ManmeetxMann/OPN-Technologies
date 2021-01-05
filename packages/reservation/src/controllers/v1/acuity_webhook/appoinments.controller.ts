import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {AppoinmentService} from '../../../services/appoinment.service'
import {PackageService} from '../../../services/package.service'
import {ScheduleWebhookRequest} from '../../../models/webhook'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {isEmpty} from 'lodash'
import {AppointmentStatus, AcuityUpdateDTO, ResultTypes, AppointmentModelBase} from '../../../models/appointment'
import moment from 'moment'
import {dateFormats, timeFormats} from '../../../../../common/src/utils/times'

class AppointmentWebhookController implements IControllerBase {
  public path = '/reservation/acuity_webhook/api/v1/appointment'
  public router = Router()
  private appoinmentService = new AppoinmentService()
  private packageService = new PackageService()

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

      let deadline: string
      const utcDateTime = moment(appointment.datetime).utc()

      const dateTime = utcDateTime.format()
      const dateOfAppointment = utcDateTime.format(dateFormats.longMonth)
      const timeOfAppointment = utcDateTime.format(timeFormats.standard12h)

      if (utcDateTime.hours() > 12) {
        deadline = this.appoinmentService.makeTimeEndOfTheDay(utcDateTime.add(1, 'd'))
      } else {
        deadline = this.appoinmentService.makeTimeEndOfTheDay(utcDateTime)
      }

      const dataForUpdate: AcuityUpdateDTO = {}
      if (!appointment.barCode) {
        dataForUpdate['barCodeNumber'] = await this.appoinmentService.getNextBarCodeNumber()
      } else {
        try{
          const blockDuplicate = true
          await this.appoinmentService.getAppointmentByBarCode(
            appointment.barCode,
            blockDuplicate
          )
        }catch(getAppoinmentError){
          //It is Ok if Resource Not Found
          if (!(getAppoinmentError instanceof ResourceNotFoundException)) {
            throw getAppoinmentError
          }
        }
        
      }

      if (appointment.certificate && !appointment.organizationId) {
        const packageResult = await this.packageService.getByPackageCode(appointment.certificate)

        if (packageResult) {
          dataForUpdate['organizationId'] = packageResult.organizationId
        } else {
          console.log(
            `WebhookController: NoPackageToORGAssoc AppoinmentID: ${id} -  PackageCode: ${appointment.certificate}`,
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
        
        const {barCodeNumber, organizationId} = dataForUpdate
        const data = {
          acuityAppointmentId: appointment.id,
          appointmentStatus: AppointmentStatus.pending,
          barCode: appointment.barCode || barCodeNumber,
          canceled: appointment.canceled,
          dateOfAppointment,
          dateOfBirth: appointment.dateOfBirth,
          dateTime,
          deadline,
          email: appointment.email,
          firstName: appointment.firstName,
          lastName: appointment.lastName,
          location: appointment.location,
          organizationId: appointment.organizationId || organizationId || null,
          packageCode: appointment.certificate,
          phone: appointment.phone,
          registeredNursePractitioner: appointment.registeredNursePractitioner,
          result: ResultTypes.Pending,
          timeOfAppointment
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
