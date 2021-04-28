import {isEmpty} from 'lodash'
import {NextFunction, Request, Response, Router} from 'express'

//Common
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {LogError, LogInfo, LogWarning} from '../../../../../common/src/utils/logging-setup'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
//Services
import {AppoinmentService} from '../../../services/appoinment.service'
import {PackageService} from '../../../services/package.service'
import {PCRTestResultsService} from '../../../services/pcr-test-results.service'
//Models
import {AppointmentSyncRequest} from '../../../models/webhook'
import {
  AppointmentStatus,
  AcuityUpdateDTO,
  AppointmentAcuityResponse,
  ResultTypes,
  AppointmentDBModel,
} from '../../../models/appointment'

class InternalSyncAppointmentController implements IControllerBase {
  public path = '/reservation/internal/api/v1/appointments'
  public router = Router()
  private appoinmentService = new AppoinmentService()
  private packageService = new PackageService()
  private pcrTestResultsService = new PCRTestResultsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/sync-labels-to-acuity', this.syncLabelsToAcuity)
    this.router.post(this.path + '/sync-barcode-to-acuity', this.syncBarCodeToAcuity)
    this.router.post(this.path + '/sync-from-acuity', this.syncAppointmentFromAcuityToDB)
  }

  syncBarCodeToAcuity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {acuityID, barCode} = req.body
    try {
      LogInfo('AppointmentWebhookController:syncBarCodeToAcuity', 'SyncBarcodeRequested', {
        acuityID,
        barCode,
      })

      await this.appoinmentService.addAppointmentBarCodeOnAcuity(acuityID, barCode)

      res.json(actionSucceed(''))
    } catch (error) {
      LogError(`AppointmentWebhookController:syncBarCodeToAcuity`, 'FailedToProcessRequest', {
        errorMessage: error.toString(),
      })
      next(error)
    }
  }

  syncLabelsToAcuity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {acuityID, label} = req.body
    try {
      LogInfo('AppointmentWebhookController:syncLabelsToAcuity', 'SyncLabelsRequested', {
        acuityID,
        label,
      })

      await this.appoinmentService.addAppointmentLabelOnAcuity(acuityID, label)

      res.json(actionSucceed(''))
    } catch (error) {
      LogError(`AppointmentWebhookController:syncLabelsToAcuity`, 'FailedToProcessRequest', {
        errorMessage: error.toString(),
      })
      next(error)
    }
  }

  syncAppointmentFromAcuityToDB = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const {
      acuityID,
      action,
      calendarID,
      appointmentTypeID,
      returnData,
    } = req.body as AppointmentSyncRequest
    try {
      LogInfo('AppointmentWebhookController:syncAppointmentFromAcuityToDB', 'SyncRequested', {
        acuityID,
        calendarID,
        appointmentTypeID,
        action,
      })

      let acuityAppointment: AppointmentAcuityResponse = null
      try {
        acuityAppointment = await this.appoinmentService.getAppointmentByIdFromAcuity(acuityID)
      } catch (error) {}

      if (!acuityAppointment) {
        LogWarning(
          `AppointmentWebhookController:syncAppointmentFromAcuityToDB`,
          'InvalidAcuityIDPosted',
          {
            acuityID: acuityID,
            action,
          },
        )
        res.json(actionSucceed(returnData ? {state: 'InvalidAcuityIDPosted'} : {}))
        return
      }

      const dataForUpdate = await this.updateInformationOnAcuity(acuityID, acuityAppointment)

      const appointmentFromDb = await this.appoinmentService.getAppointmentByAcuityId(acuityID)
      if (appointmentFromDb) {
        const noUpdatesAllowedStatus = [
          AppointmentStatus.Reported,
          AppointmentStatus.Canceled,
          AppointmentStatus.ReCollectRequired,
        ]
        if (noUpdatesAllowedStatus.includes(appointmentFromDb.appointmentStatus)) {
          LogWarning(
            `AppointmentWebhookController:syncAppointmentFromAcuityToDB`,
            'AppointmentUpdateNotAllowed',
            {
              acuityID,
              appoinmentID: appointmentFromDb.id,
              appointmentStatus: appointmentFromDb.appointmentStatus,
            },
          )
        } else {
          LogInfo(
            `AppointmentWebhookController:syncAppointmentFromAcuityToDB`,
            'AlreadyCreatedUpdatingNow',
            {
              acuityID,
              appoinmentID: appointmentFromDb.id,
            },
          )
          this.handleUpdateAppointment(acuityAppointment, dataForUpdate, appointmentFromDb)
        }
      } else {
        this.handleCreateAppointment(acuityAppointment, dataForUpdate)
      }
      res.json(actionSucceed(''))
    } catch (error) {
      LogError(
        `AppointmentWebhookController:syncAppointmentFromAcuityToDB`,
        'FailedToProcessRequest',
        {
          errorMessage: error.toString(),
        },
      )
      next(error)
    }
  }

  private handleCreateAppointment = async (
    acuityAppointment: AppointmentAcuityResponse,
    dataForUpdate: AcuityUpdateDTO,
  ): Promise<void> => {
    try {
      const {barCodeNumber, organizationId} = dataForUpdate
      const barCode = acuityAppointment.barCode || barCodeNumber

      const savedAppointment = await this.appoinmentService.createAppointmentFromAcuity(
        acuityAppointment,
        {
          appointmentStatus: AppointmentStatus.Pending,
          barCodeNumber: barCode,
          latestResult: ResultTypes.Pending,
          organizationId,
        },
      )
      LogInfo('CreateAppointmentFromWebhook', 'SuccessCreateAppointment', {
        acuityID: acuityAppointment.id,
        appointmentID: savedAppointment.id,
      })
    } catch (e) {
      LogError('CreateAppointmentFromWebhook', 'FailedToCreateAppointment', {
        acuityID: acuityAppointment.id,
        errorMessage: e.toString(),
      })
    }
  }

  private handleUpdateAppointment = async (
    acuityAppointment: AppointmentAcuityResponse,
    dataForUpdate: AcuityUpdateDTO,
    appointmentFromDb: AppointmentDBModel,
  ): Promise<void> => {
    try {
      let appointmentStatus = appointmentFromDb.appointmentStatus
      if (
        acuityAppointment.canceled &&
        appointmentFromDb.appointmentStatus != AppointmentStatus.Canceled
      ) {
        LogInfo('UpdateAppointmentFromWebhook', 'AppointmentStatusUpdatedToCancel', {
          appoinmentID: appointmentFromDb.id,
          acuityID: acuityAppointment.id,
        })
        appointmentStatus = AppointmentStatus.Canceled
      }

      const {barCodeNumber, organizationId} = dataForUpdate
      const barCode = appointmentFromDb.barCode || barCodeNumber // Don't take Update Barcode from Acuity
      const updatedAppointment = await this.appoinmentService.updateAppointmentFromAcuity(
        appointmentFromDb,
        acuityAppointment,
        {
          appointmentStatus,
          barCodeNumber: barCode,
          latestResult: appointmentFromDb.latestResult,
          organizationId,
        },
      )
      LogInfo('UpdateAppointmentFromWebhook', 'UpdatedAppointmentSuccessfully', {
        appoinmentID: updatedAppointment.id,
        acuityID: acuityAppointment.id,
        barCode: barCode,
      })
      const noResultEntryStatus = [AppointmentStatus.Pending, AppointmentStatus.CheckedIn]
      if (!noResultEntryStatus.includes(updatedAppointment.appointmentStatus)) {
        const pcrTestResult = await this.pcrTestResultsService.updatePCRResultsFromAcuity(
          updatedAppointment,
          'WEBHOOK',
        )
        LogInfo(
          'InternalSyncAppointmentController:handleUpdateAppointment',
          'UpdatedPCRResultsSuccessfully',
          {
            appointmentID: updatedAppointment.id,
            pcrResultID: pcrTestResult.id,
            acuityID: acuityAppointment.id,
            barCode: barCode,
          },
        )
      }
    } catch (e) {
      if (acuityAppointment.canceled) {
        LogInfo('UpdateAppointmentFromWebhook', 'AlreadyCanceledAppoinment', {
          appoinmentID: appointmentFromDb.id,
          acuityID: acuityAppointment.id,
          error: e.toString(),
        })
      } else {
        LogError('UpdateAppointmentFromWebhook', 'FailedToUpdateAppointment', {
          acuityID: acuityAppointment.id,
          errorMessage: e.toString(),
        })
      }
    }
  }

  private updateInformationOnAcuity = async (
    id: number,
    appointment: AppointmentAcuityResponse,
  ): Promise<AcuityUpdateDTO> => {
    const dataForUpdate: AcuityUpdateDTO = {}
    //TODO: RENAME barCodeNumber to barCode
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
      LogInfo(
        `AppointmentWebhookController:updateInformationOnAcuity`,
        `SaveToAcuitySuccessfully`,
        {
          ...dataForUpdate,
          acuityID: savedOnAcuity.id,
        },
      )
    } else {
      LogInfo(`AppointmentWebhookController:updateInformationOnAcuity`, 'NoUpdateToAcuity', {
        appoinmentID: id,
      })
    }
    return dataForUpdate
  }
}

export default InternalSyncAppointmentController
