import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {AppoinmentService} from '../../../services/appoinment.service'
import {PackageService} from '../../../services/package.service'
import {PCRTestResultsService} from '../../../services/pcr-test-results.service'
import {ScheduleWebhookRequest} from '../../../models/webhook'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {isEmpty} from 'lodash'
import {
  AppointmentStatus,
  AcuityUpdateDTO,
  AcuityWebhookActions,
  AppointmentAcuityResponse,
  WebhookEndpoints,
  ResultTypes,
} from '../../../models/appointment'
import {DuplicateDataException} from '../../../../../common/src/exceptions/duplicate-data-exception'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'

class AppointmentWebhookController implements IControllerBase {
  public path = '/reservation/acuity_webhook/api/v1/appointment'
  public router = Router()
  private appoinmentService = new AppoinmentService()
  private packageService = new PackageService()
  private pcrTestResultsService = new PCRTestResultsService()

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
          `AppointmentWebhookController: CreateAppointment AlreadyAdded AcuityID: ${id} FirebaseID: ${appointmentFromDb.id}`,
        )
        throw new DuplicateDataException(`AcuityID: ${id} already added`)
      }

      try {
        const {barCodeNumber, organizationId} = dataForUpdate

        const savedAppointment = await this.appoinmentService.createAppointmentFromAcuity(
          appointment,
          {
            barCodeNumber,
            organizationId,
            appointmentTypeID,
            calendarID,
            appointmentStatus: AppointmentStatus.Pending,
            latestResult: ResultTypes.Pending,
          },
        )
        console.log(
          `AppointmentWebhookController: CreateAppointment: SuccessCreateAppointment for AppointmentID: ${savedAppointment.id} AcuityID: ${id}`,
        )
        if (savedAppointment) {
          const pcrTestResult = await this.pcrTestResultsService.createNewPCRTestForWebhook(
            savedAppointment,
          )
          console.log(
            `AppointmentWebhookController: CreateAppointment: SuccessCreatePCRResults for AppointmentID: ${savedAppointment.id} PCR Results ID: ${pcrTestResult.id}`,
          )
        }
      } catch (e) {
        console.error(
          `AppointmentWebhookController: SaveToTestResults Failed AppoinmentID: ${id}  ${e.toString()}`,
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
          `AppointmentWebhookController: UpdateAppointment: AppointmentNotExist for AcuityID On Acuity: ${id}`,
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
          `AppointmentWebhookController: UpdateAppointment: Failed AppointmentNotExist for AcuityID: ${id} in DB`,
        )
        throw new ResourceNotFoundException(`AcuityID: ${id} not found`)
      }

      try {
        let appointmentStatus = appointmentFromDb.appointmentStatus
        if (
          appointment.canceled &&
          appointmentFromDb.appointmentStatus != AppointmentStatus.Canceled
        ) {
          console.log(
            `AppointmentWebhookController: UpdateAppointment:  Appointment Status will be updated to Cancelled`,
          )
          appointmentStatus = AppointmentStatus.Canceled
        }

        const {barCodeNumber, organizationId} = dataForUpdate
        const barCode = appointment.barCode || barCodeNumber
        const updatedAppointment = await this.appoinmentService.updateAppointmentFromAcuity(
          appointmentFromDb.id,
          appointment,
          {
            barCodeNumber: barCode,
            appointmentStatus,
            organizationId,
            appointmentTypeID,
            calendarID,
            latestResult: appointmentFromDb.latestResult,
          },
        )
        console.log(
          `AppointmentWebhookController: UpdateAppointment: SuccessUpdateAppointment for AppointmentID: ${appointmentFromDb.id} AcuityID: ${id}`,
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
            `AppointmentWebhookController: UpdateAppointment: AppointmentCancelled ID: ${appointmentFromDb.id} Removed PCR Results ID: ${pcrTestResult.id}`,
          )
        } else {
          const linkedBarcodes = await this.pcrTestResultsService.getlinkedBarcodes(
            appointment.certificate,
          )
          const pcrResultDataForDb = {
            adminId: 'WEBHOOK',
            appointmentId: appointmentFromDb.id,
            barCode: barCode,
            dateOfAppointment: updatedAppointment.dateOfAppointment,
            displayForNonAdmins: true,
            deadline: updatedAppointment.deadline,
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
            `AppointmentWebhookController: UpdateAppointment: SuccessUpdatedPCRResults for PCRResultsID: ${pcrTestResult.id}`,
          )
        }
      } catch (e) {
        if (appointment.canceled) {
          console.log(
            `AppointmentWebhookController: UpdateAppointment: Cancelled AppoinmentID: ${id}. Hence No PCR Results Updates.`,
          )
        } else {
          console.error(
            `AppointmentWebhookController: UpdateAppointment: FailedToUpdateAppointment for AppoinmentID: ${id} ${e.toString()}`,
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
          `AppointmentWebhookController: ${endpoint}Appointment NoPackageToORGAssoc AppoinmentID: ${id} -  PackageCode: ${appointment.certificate}`,
        )
      }
    }

    if (!isEmpty(dataForUpdate)) {
      const savedOnAcuity = await this.appoinmentService.updateAppointment(id, dataForUpdate)
      console.log(
        `AppointmentWebhookController: ${endpoint}Appointment SaveToAcuity AppoinmentID: ${
          savedOnAcuity.id
        } barCodeNumber: ${JSON.stringify(dataForUpdate)}`,
      )
    } else {
      console.log(
        `AppointmentWebhookController: ${endpoint}Appointment NoUpdateToAcuity AppoinmentID: ${id} barCodeNumber: ${appointment.barCode}  organizationId: ${appointment.organizationId}`,
      )
    }
    return dataForUpdate
  }
}

export default AppointmentWebhookController
