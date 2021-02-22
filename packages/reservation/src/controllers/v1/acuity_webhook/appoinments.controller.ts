import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {LogError, LogInfo} from '../../../../../common/src/utils/logging-setup'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {AppoinmentService} from '../../../services/appoinment.service'
import {PackageService} from '../../../services/package.service'
import {PCRTestResultsService} from '../../../services/pcr-test-results.service'
import {ScheduleWebhookRequest} from '../../../models/webhook'
import {isEmpty} from 'lodash'
import {
  AppointmentStatus,
  AcuityUpdateDTO,
  AcuityWebhookActions,
  AppointmentAcuityResponse,
  WebhookEndpoints,
  ResultTypes,
} from '../../../models/appointment'

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
        throw new BadRequestException(`OnlyScheduledActionIsAllowed for ${id}`)
      }

      const appointment = await this.appoinmentService.getAppointmentByIdFromAcuity(id)
      if (!appointment) {
        throw new ResourceNotFoundException(`AppointmentNotFound on Acuity AcuityID: ${id}`)
      }
      const dataForUpdate = await this.updateInformationOnAcuity(
        id,
        appointment,
        WebhookEndpoints.Create,
      )

      const appointmentFromDb = await this.appoinmentService.getAppointmentByAcuityId(id)
      if (appointmentFromDb) {
        LogError(`AppointmentWebhookController`, 'AppointmentAlreadyCreated', {
          acuityID: id,
          appoinmentID: appointmentFromDb.id,
        })
        throw new BadRequestException(`AppointmentAlreadyCreated for ${id}`)
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
        LogInfo('CreateAppointmentFromWebhook', 'SuccessCreateAppointment', {
          acuityID: id,
          appointmentID: savedAppointment.id,
        })

        if (savedAppointment) {
          const pcrTestResult = await this.pcrTestResultsService.createNewPCRTestForWebhook(
            savedAppointment,
          )
          LogInfo('CreateAppointmentFromWebhook', 'SuccessCreatePCRResults', {
            acuityID: id,
            appointmentID: savedAppointment.id,
            pcrTestResultID: pcrTestResult.id,
          })
        }
      } catch (e) {
        LogError('CreateAppointmentFromWebhook', 'FailedToCreateAppointment', {
          acuityID: id,
          error: e.toString(),
        })
      }

      res.json(actionSucceed(''))
    } catch (error) {
      LogError(`CreateAppointmentFromWebhook`, 'FailedToProcessRequest', {
        error: error.toString(),
      })
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
        throw new BadRequestException(`ScheduledActionIsNotAllowed for ${id}`)
      }

      const appointment = await this.appoinmentService.getAppointmentByIdFromAcuity(id)
      if (!appointment) {
        throw new ResourceNotFoundException(`AppointmentNotFound on Acuity AcuityID: ${id}`)
      }
      const dataForUpdate = await this.updateInformationOnAcuity(
        id,
        appointment,
        WebhookEndpoints.Update,
      )

      const appointmentFromDb = await this.appoinmentService.getAppointmentByAcuityId(id)
      if (!appointmentFromDb) {
        throw new ResourceNotFoundException(`AppointmentNotFound in DB AcuityID: ${id}`)
      }

      try {
        let appointmentStatus = appointmentFromDb.appointmentStatus
        if (
          appointment.canceled &&
          appointmentFromDb.appointmentStatus != AppointmentStatus.Canceled
        ) {
          LogInfo('UpdateAppointmentFromWebhook', 'AppointmentStatusUpdatedToCancel', {
            appoinmentID: appointmentFromDb.id,
            acuityID: id,
          })
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
        LogInfo('UpdateAppointmentFromWebhook', 'AppointmentSuccessfullyUpdated', {
          appoinmentID: appointmentFromDb.id,
          acuityID: id,
          barCode: barCode,
        })
        const pcrTestResult = await this.pcrTestResultsService.getWaitingPCRResultsByAppointmentId(
          appointmentFromDb.id,
        )
        //getWaitingPCRResultsByAppointmentId will throw exception if pcrTestResult doesn't exists

        if (
          action === AcuityWebhookActions.Canceled ||
          appointmentStatus === AppointmentStatus.Canceled
        ) {
          await this.pcrTestResultsService.deleteTestResults(pcrTestResult.id)
          LogInfo('UpdateAppointmentFromWebhook', 'RemovedResults', {
            appoinmentID: appointmentFromDb.id,
            pcrResultID: pcrTestResult.id,
          })
        } else {
          const linkedBarcodes = await this.pcrTestResultsService.getlinkedBarcodes(
            appointment.certificate,
          )
          const pcrResultDataForDb = {
            adminId: 'WEBHOOK',
            appointmentId: appointmentFromDb.id,
            barCode: barCode,
            dateOfAppointment: updatedAppointment.dateOfAppointment,
            displayInResult: true,
            dateTime: updatedAppointment.dateTime,
            deadline: updatedAppointment.deadline,
            firstName: appointment.firstName,
            lastName: appointment.lastName,
            linkedBarCodes: linkedBarcodes,
            organizationId: updatedAppointment.organizationId,
            //result: ResultTypes.Pending,
            //runNumber: 1 ,//Start the Run
            //waitingResult: true,
          }

          await this.pcrTestResultsService.updateDefaultTestResults(
            pcrTestResult.id,
            pcrResultDataForDb,
          )
          LogInfo('UpdateAppointmentFromWebhook', 'UpdatedPCRResultsSuccessfully', {
            appoinmentID: appointmentFromDb.id,
            pcrResultID: pcrTestResult.id,
          })
        }
      } catch (e) {
        if (appointment.canceled) {
          LogInfo('UpdateAppointmentFromWebhook', 'AlreadyCanceledAppoinment', {
            appoinmentID: appointmentFromDb.id,
            acuityID: id,
            error: e.toString(),
          })
        } else {
          LogError('UpdateAppointmentFromWebhook', 'FailedToUpdateAppointment', {
            acuityID: id,
            error: e.toString(),
          })
        }
      }

      res.json(actionSucceed(''))
    } catch (error) {
      LogError(`UpdateAppointmentFromWebhook`, 'FailedToProcessRequest', {
        error: error.toString(),
      })
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
        LogError('UpdateInformationOnAcuity', 'NoPackageToORGAssoc', {
          acuityID: id,
          packageCode: appointment.certificate,
        })
      }
    }

    if (!isEmpty(dataForUpdate)) {
      const savedOnAcuity = await this.appoinmentService.updateAppointment(id, dataForUpdate)
      LogInfo(`${endpoint}AppointmentWebhook`, `SaveToAcuitySuccessfully`, {
        ...dataForUpdate,
        acuityID: savedOnAcuity.id,
      })
    } else {
      LogInfo(`${endpoint}AppointmentWebhook`, 'NoUpdateToAcuity', {
        appoinmentID: id,
      })
    }
    return dataForUpdate
  }
}

export default AppointmentWebhookController
