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
  AcuityWebhookActions,
  AppointmentAcuityResponse,
  WebhookEndpoints,
} from '../../../models/appointment'
import moment from 'moment-timezone'
import {dateFormats, timeFormats} from '../../../../../common/src/utils/times'
import {DuplicateDataException} from '../../../../../common/src/exceptions/duplicate-data-exception'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {makeDeadline} from '../../../utils/datetime.helper'
import {Config} from '../../../../../common/src/utils/config'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

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

      if (action !== AcuityWebhookActions.Scheduled) {
        throw new BadRequestException('Only scheduled Action is allowed')
      }

      const appointment = await this.appoinmentService.getAppointmentByIdFromAcuity(id)
      if (!appointment) {
        throw new ResourceNotFoundException(`Appointment with ${id} id not found`)
      }
      const dataForUpdate = await this.updateInformationOnAcuity(
        id,
        appointment,
        WebhookEndpoints.Create,
      )

      const appointmentFromDb = await this.appoinmentService.getAppointmentByAcuityId(id)
      if (appointmentFromDb) {
        console.error(
          `WebhookController: CreateAppointment AlreadyAdded AcuityID: ${id} FirebaseID: ${appointmentFromDb.id}`,
        )
        throw new DuplicateDataException(`AcuityID: ${id} already added`)
      }

      try {
        const utcDateTime = moment(appointment.datetime).utc()
        const dateTimeTz = moment(appointment.datetime).tz(timeZone)

        const dateTime = utcDateTime.format()
        const dateOfAppointment = dateTimeTz.format(dateFormats.longMonth)
        const timeOfAppointment = dateTimeTz.format(timeFormats.standard12h)
        const label = appointment.labels ? appointment.labels[0]?.name : null
        const deadline: string = makeDeadline(utcDateTime, label)
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
        console.log(
          `WebhookController: CreateAppointment: SuccessCreateAppointment for AppointmentID: ${savedAppoinment.id} AcuityID: ${id}`,
        )
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
            runNumber: 1 ,//Start the Run
            waitingResult: true
          }
          const pcrTestResult = await this.pcrTestResultsService.saveDefaultTestResults(
            pcrResultDataForDb,
          )
          console.log(
            `WebhookController: CreateAppointment: SuccessCreatePCRResults for AppointmentID: ${savedAppoinment.id} PCR Results ID: ${pcrTestResult.id}`,
          )
        }
      } catch (e) {
        console.error(
          `WebhookController: SaveToTestResults Failed AppoinmentID: ${id}  ${e.toString()}`,
        )
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

      if (action === AcuityWebhookActions.Scheduled) {
        throw new BadRequestException('Scheduled Action is not allowed')
      }

      const appointment = await this.appoinmentService.getAppointmentByIdFromAcuity(id)
      if (!appointment) {
        console.error(
          `WebhookController: UpdateAppointment: AppointmentNotExist for AcuityID On Acuity: ${id}`,
        )
        throw new ResourceNotFoundException(`Appointment with ${id} id not found`)
      }
      const dataForUpdate = await this.updateInformationOnAcuity(
        id,
        appointment,
        WebhookEndpoints.Update,
      )

      const appointmentFromDb = await this.appoinmentService.getAppointmentByAcuityId(id)
      if (!appointmentFromDb) {
        console.error(
          `WebhookController: UpdateAppointment: Failed AppointmentNotExist for AcuityID: ${id} in DB`,
        )
        throw new ResourceNotFoundException(`AcuityID: ${id} not found`)
      }

      try {
        const utcDateTime = moment(appointment.datetime).utc()

        const dateTimeTz = moment(appointment.datetime).tz(timeZone)

        const dateTime = utcDateTime.format()
        const dateOfAppointment = dateTimeTz.format(dateFormats.longMonth)
        const timeOfAppointment = dateTimeTz.format(timeFormats.standard12h)
        const label = appointment.labels ? appointment.labels[0]?.name : null
        const deadline: string = makeDeadline(utcDateTime, label)

        let appointmentStatus = appointmentFromDb.appointmentStatus
        if (
          appointment.canceled &&
          appointmentFromDb.appointmentStatus != AppointmentStatus.Canceled
        ) {
          console.log(
            `WebhookController: UpdateAppointment:  Appointment Status will be updated to Cancelled`,
          )
          appointmentStatus = AppointmentStatus.Canceled
        }

        const {barCodeNumber, organizationId} = dataForUpdate
        const barCode = appointment.barCode || barCodeNumber
        const data = {
          acuityAppointmentId: appointment.id,
          appointmentStatus: appointmentStatus,
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
        console.log(
          `WebhookController: UpdateAppointment: SuccessUpdateAppointment for AppointmentID: ${appointmentFromDb.id} AcuityID: ${id}`,
        )
        const pcrTestResult = await this.pcrTestResultsService.getWaitingPCRResultsByAppointmentId(
          appointmentFromDb.id,
        )
        //getWaitingPCRResultsByAppointmentId will throw exception if pcrTestResult doesn't exists

        if (
          action === AcuityWebhookActions.Canceled ||
          appointmentStatus === AppointmentStatus.Canceled
        ) {
          await this.pcrTestResultsService.deleteTestResults(pcrTestResult.id)
          console.log(
            `WebhookController: UpdateAppointment: AppointmentCancelled ID: ${appointmentFromDb.id} Removed PCR Results ID: ${pcrTestResult.id}`,
          )
        } else {
          const linkedBarcodes = await this.getlinkedBarcodes(appointment.certificate)
          const pcrResultDataForDb = {
            adminId: 'WEBHOOK',
            appointmentId: appointmentFromDb.id,
            barCode: barCode,
            dateOfAppointment,
            displayForNonAdmins: true,
            deadline,
            firstName: appointment.firstName,
            lastName: appointment.lastName,
            linkedBarCodes: linkedBarcodes,
            organizationId: appointment.organizationId,
            //result: ResultTypes.Pending,
            //runNumber: 1 ,//Start the Run
            //waitingResult: true,
          }

          await this.pcrTestResultsService.updateDefaultTestResults(
            pcrTestResult.id,
            pcrResultDataForDb,
          )
          console.log(
            `WebhookController: UpdateAppointment: SuccessUpdatedPCRResults for PCRResultsID: ${pcrTestResult.id}`,
          )
        }
        
      } catch (e) {
        if (appointment.canceled) {
          console.log(
            `WebhookController: UpdateAppointment: Cancelled AppoinmentID: ${id}. Hence No PCR Results Updates.`,
          )
        } else {
          console.error(
            `WebhookController: UpdateAppointment: FailedToUpdateAppointment for AppoinmentID: ${id} ${e.toString()}`,
          )
        }
      }

      res.json(actionSucceed(''))
    } catch (error) {
      next(error)
    }
  }

  private updateInformationOnAcuity = async (
    id: number,
    appointment: AppointmentAcuityResponse,
    endpoint: WebhookEndpoints,
  ): Promise<AcuityUpdateDTO> => {
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
          `WebhookController: ${endpoint}Appointment NoPackageToORGAssoc AppoinmentID: ${id} -  PackageCode: ${appointment.certificate}`,
        )
      }
    }

    if (!isEmpty(dataForUpdate)) {
      const savedOnAcuity = await this.appoinmentService.updateAppointment(id, dataForUpdate)
      console.log(
        `WebhookController: ${endpoint}Appointment SaveToAcuity AppoinmentID: ${
          savedOnAcuity.id
        } barCodeNumber: ${JSON.stringify(dataForUpdate)}`,
      )
    } else {
      console.log(
        `WebhookController: ${endpoint}Appointment NoUpdateToAcuity AppoinmentID: ${id} barCodeNumber: ${appointment.barCode}  organizationId: ${appointment.organizationId}`,
      )
    }
    return dataForUpdate
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
          console.error(
            `WebhookController: Coupon Code: ${couponCode} Last BarCode: ${
              coupon.lastBarcode
            }. No Test Results to Link. ${error.toString()}`,
          )
        }
        console.log(`WebhookController: ${couponCode} Return linkedBarcodes as ${linkedBarcodes}`)
      } else {
        console.log(`WebhookController: ${couponCode} is not coupon.`)
      }
    }
    return linkedBarcodes
  }
}

export default AppointmentWebhookController
