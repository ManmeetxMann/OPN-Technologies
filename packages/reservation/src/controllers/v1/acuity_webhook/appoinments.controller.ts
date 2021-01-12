import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {AppoinmentService} from '../../../services/appoinment.service'
import {CouponService} from '../../../services/coupon.service'
import {PackageService} from '../../../services/package.service'
import {PCRTestResultsService} from '../../../services/pcr-test-results.service'
import {ScheduleWebhookRequest} from '../../../models/webhook'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {isEmpty} from 'lodash'
import {
  AppointmentStatus,
  AcuityUpdateDTO,
  ResultTypes,
  AppointmentWebhookActions,
} from '../../../models/appointment'
import moment from 'moment'
import {dateFormats, timeFormats} from '../../../../../common/src/utils/times'
import {DuplicateDataException} from '../../../../../common/src/exceptions/duplicate-data-exception'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {makeTimeEndOfTheDay} from '../../../../../common/src/utils/utils'

class AppointmentWebhookController implements IControllerBase {
  public path = '/reservation/acuity_webhook/api/v1/appointment'
  public router = Router()
  private appoinmentService = new AppoinmentService()
  private packageService = new PackageService()
  private pcrTestResultsService = new PCRTestResultsService()
  private couponService = new CouponService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/create', this.handleCreateAppointment)
    this.router.post(this.path + '/update', this.handleUpdateAppointment)
  }

  handleCreateAppointment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {id, action, calendarID, appointmentTypeID} = req.body as ScheduleWebhookRequest

      if (action !== AppointmentWebhookActions.Scheduled) {
        throw new BadRequestException('Only scheduled Action is allowed')
      }

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
        deadline = makeTimeEndOfTheDay(utcDateTime.add(1, 'd'))
      } else {
        deadline = makeTimeEndOfTheDay(utcDateTime)
      }

      const dataForUpdate: AcuityUpdateDTO = {}
      if (!appointment.barCode) {
        dataForUpdate['barCodeNumber'] = await this.appoinmentService.getNextBarCodeNumber()
      }

      if (appointment.certificate && !appointment.organizationId) {
        //Update ORGs
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

      const appointmentFromDb = await this.appoinmentService.getAppointmentByAcuityId(id)
      if (appointmentFromDb) {
        console.log(
          `WebhookController: AlreadyAdded AcuityID: ${id} FirebaseID: ${appointmentFromDb.id}`,
        )
        throw new DuplicateDataException(`AcuityID: ${id} already added`)
      }

      try {
        const {barCodeNumber, organizationId} = dataForUpdate
        const barCode = appointment.barCode || barCodeNumber
        const data = {
          acuityAppointmentId: appointment.id,
          appointmentTypeID,
          appointmentStatus: AppointmentStatus.Pending,
          barCode: barCode,
          canceled: appointment.canceled,
          calendarID,
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
          latestResult: ResultTypes.Pending,
          timeOfAppointment,
        }
        const savedAppoinment = await this.appoinmentService.saveAppointmentData(data)
        if (savedAppoinment) {
          const linkedBarcodes = await this.getlinkedBarcodes(appointment.certificate)
          //Save Pending Test Results
          const pcrResultDataForDb = {
            adminId: 'WEBHOOK',
            appointmentId: savedAppoinment.id,
            barCode: barCode,
            dateOfAppointment,
            displayForNonAdmins: true,
            deadline,
            firstName: appointment.firstName,
            lastName: appointment.lastName,
            linkedBarCodes: linkedBarcodes,
            organizationId: appointment.organizationId,
            result: ResultTypes.Pending,
            waitingResult: true,
          }
          await this.pcrTestResultsService.saveDefaultTestResults(pcrResultDataForDb)
        }
      } catch (e) {
        console.log(`WebhookController: SaveToTestResults Failed AppoinmentID: ${id}`)
        console.log(e)
      }

      res.json(actionSucceed(''))
    } catch (error) {
      next(error)
    }
  }

  handleUpdateAppointment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {id, action, calendarID, appointmentTypeID} = req.body as ScheduleWebhookRequest

      if (action === AppointmentWebhookActions.Scheduled) {
        throw new BadRequestException('Scheduled Action is not allowed')
      }

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
        deadline = makeTimeEndOfTheDay(utcDateTime.add(1, 'd'))
      } else {
        deadline = makeTimeEndOfTheDay(utcDateTime)
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
            `WebhookController: NoPackageToORGAssoc AppoinmentID: ${id} -  PackageCode: ${appointment.certificate}`,
          )
        }
      }

      const appointmentFromDb = await this.appoinmentService.getAppointmentByAcuityId(id)
      if (!appointmentFromDb) {
        //TODO CRITICAL
        console.log(`WebhookController: AppointmentNotExist AcuityID: ${id}`)
        throw new ResourceNotFoundException(`AcuityID: ${id} not found`)
      }

      try {
        const {barCodeNumber, organizationId} = dataForUpdate
        const barCode = appointment.barCode || barCodeNumber
        const data = {
          acuityAppointmentId: appointment.id,
          appointmentTypeID,
          barCode: barCode,
          canceled: appointment.canceled,
          calendarID,
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
          timeOfAppointment,
        }
        await this.appoinmentService.updateAppointmentDB(appointmentFromDb.id, data)

        const pcrTestResult = await this.pcrTestResultsService.getWaitingPCRResultsByAppointmentId(
          appointmentFromDb.id,
        )

        if (pcrTestResult) {
          if (action === AppointmentWebhookActions.Canceled) {
            await this.pcrTestResultsService.deleteTestResults(pcrTestResult.id)
            console.log(
              `WebhookController: Appointment Cancelled hence Removed PCR Results ID: ${pcrTestResult.id}`,
            )
          } else {
            const linkedBarcodes = await this.getlinkedBarcodes(appointment.certificate)
            const pcrResultDataForDb = {
              appointmentId: appointmentFromDb.id,
              barCode: barCode,
              dateOfAppointment,
              displayForNonAdmins: true,
              deadline,
              firstName: appointment.firstName,
              lastName: appointment.lastName,
              linkedBarCodes: linkedBarcodes,
              organizationId: appointment.organizationId,
              result: ResultTypes.Pending,
              waitingResult: true,
            }

            await this.pcrTestResultsService.updateDefaultTestResults(
              pcrTestResult.id,
              pcrResultDataForDb,
            )
            console.log(
              `WebhookController: Updated Results for PCR Results ID: ${pcrTestResult.id}`,
            )
          }
        } else {
          //TODO CRITICAL
          console.log(
            `WebhookController: UpdateAppointment No Test Results for AppointmentID: ${appointmentFromDb.id}`,
          )
        }
      } catch (e) {
        //TODO CRITICAL
        console.log(`WebhookController: UpdateAppointment Failed AppoinmentID: ${id}`)
        console.log(e)
      }

      res.json(actionSucceed(''))
    } catch (error) {
      next(error)
    }
  }

  private getlinkedBarcodes = async (couponCode: string): Promise<string[]> => {
    let linkedBarcodes = []
    if (couponCode) {
      //Get Coupon
      const coupon = await this.couponService.getByCouponCode(couponCode)
      if (coupon) {
        linkedBarcodes.push(coupon.lastBarcode)
        try {
          //Get Linked Barcodes for LastBarCode
          const pcrResult = await this.pcrTestResultsService.getReSampledTestResultByBarCode(
            coupon.lastBarcode,
          )
          if (pcrResult.linkedBarCodes && pcrResult.linkedBarCodes.length) {
            linkedBarcodes = linkedBarcodes.concat(pcrResult.linkedBarCodes)
          }
        } catch (error) {
          //CRITICAL
          console.log(
            `WebhookController: Coupon Code: ${couponCode} Last BarCode: ${coupon.lastBarcode} ${error}`,
          )
        }
      } else {
        console.log(`WebhookController: ${couponCode} is not coupon. Hence no history for Barcodes`)
      }
    }
    console.log(`WebhookController: ${couponCode} Return linkedBarcodes as ${linkedBarcodes}`)
    return linkedBarcodes
  }
}

export default AppointmentWebhookController
