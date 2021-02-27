import {isEmpty} from 'lodash'
import {NextFunction, Request, Response, Router} from 'express'

//Common
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import { Config } from '../../../../../common/src/utils/config'
import {LogError, LogInfo, LogWarning} from '../../../../../common/src/utils/logging-setup'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
//Services
import {AppoinmentService} from '../../../services/appoinment.service'
import {PackageService} from '../../../services/package.service'
import {PCRTestResultsService} from '../../../services/pcr-test-results.service'
//Models
import {ScheduleWebhookRequest} from '../../../models/webhook'
import {
  AppointmentStatus,
  AcuityUpdateDTO,
  AppointmentAcuityResponse,
  ResultTypes,
  AppointmentDBModel,
  TestTypes,
} from '../../../models/appointment'
//UTILS
import {getFirestoreTimeStampDate} from '../../../utils/datetime.helper'

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
    this.router.post(this.path + '/sync', this.syncAppointmentFromAcuityToDB)
  }

  syncAppointmentFromAcuityToDB = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {
        id,
        action,
        calendarID,
        appointmentTypeID,
        returnData,
      } = req.body as ScheduleWebhookRequest
      LogInfo('AppointmentWebhookController:syncAppointmentFromAcuityToDB', 'SyncRequested', {
        acuityID: id,
        calendarID,
        appointmentTypeID,
        action,
      })

      let acuityAppointment: AppointmentAcuityResponse = null
      try {
        acuityAppointment = await this.appoinmentService.getAppointmentByIdFromAcuity(id)
      } catch (error) {}

      if (!acuityAppointment) {
        LogWarning(
          `AppointmentWebhookController:syncAppointmentFromAcuityToDB`,
          'InvalidAcuityIDPosted',
          {
            acuityID: id,
            action,
          },
        )
        res.json(actionSucceed(returnData ? {state: 'InvalidAcuityIDPosted'} : {}))
        return
      }
      const testType = await this.getTestType(acuityAppointment.appointmentTypeID)

      const dataForUpdate = await this.updateInformationOnAcuity(
        id,
        acuityAppointment,
      )

      const appointmentFromDb = await this.appoinmentService.getAppointmentByAcuityId(id)
      if (appointmentFromDb) {
        const noUpdatesAllowedStatus = [
          AppointmentStatus.Reported,
          AppointmentStatus.Canceled,
          AppointmentStatus.ReCollectRequired,
        ]
        if (noUpdatesAllowedStatus.includes(appointmentFromDb.appointmentStatus)) {
          LogWarning(`AppointmentWebhookController`, 'AppointmentUpdateNotAllowed', {
            acuityID: id,
            appoinmentID: appointmentFromDb.id,
            appointmentStatus: appointmentFromDb.appointmentStatus,
          })
        } else {
          LogInfo(`AppointmentWebhookController`, 'AlreadyCreatedUpdatingNow', {
            acuityID: id,
            appoinmentID: appointmentFromDb.id,
          })
          this.handleUpdateAppointment(acuityAppointment, dataForUpdate, appointmentFromDb, testType)
        }
      } else {
        this.handleCreateAppointment(acuityAppointment, dataForUpdate, testType)
      }

      res.json(actionSucceed(''))
    } catch (error) {
      LogError(`UpdateAppointmentFromWebhook`, 'FailedToProcessRequest', {
        error: error.toString(),
      })
      next(error)
    }
  }

  getTestType = async (appointmentTypeID:number):Promise<TestTypes> => {
    return (appointmentTypeID === Config.getInt('ACUITY_APPOINTMENT_TYPE_ID'))?TestTypes.RapidAntigen:TestTypes.PCR
  }

  handleCreateAppointment = async (
    acuityAppointment: AppointmentAcuityResponse,
    dataForUpdate: AcuityUpdateDTO,
    testType: TestTypes
  ): Promise<void> => {
    try {
      const {barCodeNumber, organizationId} = dataForUpdate

      const savedAppointment = await this.appoinmentService.createAppointment(acuityAppointment, {
        appointmentStatus: AppointmentStatus.Pending,
        barCodeNumber,
        latestResult: ResultTypes.Pending,
        organizationId,
      })
      LogInfo('CreateAppointmentFromWebhook', 'SuccessCreateAppointment', {
        acuityID: acuityAppointment.id,
        appointmentID: savedAppointment.id,
      })

      if (savedAppointment) {
        const pcrTestResult = await this.pcrTestResultsService.createNewPCRTestForWebhook(
          savedAppointment,
        )
        LogInfo('CreateAppointmentFromWebhook', 'SuccessCreatePCRResults', {
          acuityID: acuityAppointment.id,
          appointmentID: savedAppointment.id,
          pcrTestResultID: pcrTestResult.id,
        })
      }
    } catch (e) {
      LogError('CreateAppointmentFromWebhook', 'FailedToCreateAppointment', {
        acuityID: acuityAppointment.id,
        error: e.toString(),
      })
    }
  }

  handleUpdateAppointment = async (
    acuityAppointment: AppointmentAcuityResponse,
    dataForUpdate: AcuityUpdateDTO,
    appointmentFromDb: AppointmentDBModel,
    testType: TestTypes
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
      const barCode = acuityAppointment.barCode || barCodeNumber
      const updatedAppointment = await this.appoinmentService.updateAppointmentFromAcuity(
        appointmentFromDb.id,
        acuityAppointment,
        {
          appointmentStatus,
          barCodeNumber: barCode,
          latestResult: appointmentFromDb.latestResult,
          organizationId,
        },
      )
      LogInfo('UpdateAppointmentFromWebhook', 'AppointmentSuccessfullyUpdated', {
        appoinmentID: appointmentFromDb.id,
        acuityID: acuityAppointment.id,
        barCode: barCode,
      })
      const pcrTestResult = await this.pcrTestResultsService.getWaitingPCRResultByAppointmentId(
        appointmentFromDb.id,
      )
      //getWaitingPCRResultByAppointmentId will throw exception if pcrTestResult doesn't exists

      if (appointmentStatus === AppointmentStatus.Canceled) {
        await this.pcrTestResultsService.deleteTestResults(pcrTestResult.id)
        LogInfo('UpdateAppointmentFromWebhook', 'RemovedResults', {
          appoinmentID: appointmentFromDb.id,
          pcrResultID: pcrTestResult.id,
        })
      } else {
        const linkedBarcodes = await this.pcrTestResultsService.getlinkedBarcodes(
          acuityAppointment.certificate,
        )
        const pcrResultDataForDb = {
          adminId: 'WEBHOOK',
          appointmentId: appointmentFromDb.id,
          barCode: barCode,
          displayInResult: true,
          dateTime: updatedAppointment.dateTime,
          deadline: updatedAppointment.deadline,
          firstName: acuityAppointment.firstName,
          lastName: acuityAppointment.lastName,
          linkedBarCodes: linkedBarcodes,
          organizationId: updatedAppointment.organizationId,
          deadlineDate: getFirestoreTimeStampDate(updatedAppointment.deadline),
          dateOfAppointment: getFirestoreTimeStampDate(updatedAppointment.dateTime),
          //result: ResultTypes.Pending,
          //runNumber: 1 ,//Start the Run
          //waitingResult: true,
        }

        await this.pcrTestResultsService.updateTestResults(
          pcrTestResult.id,
          pcrResultDataForDb,
        )
        LogInfo('UpdateAppointmentFromWebhook', 'UpdatedPCRResultsSuccessfully', {
          appoinmentID: appointmentFromDb.id,
          pcrResultID: pcrTestResult.id,
        })
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
          error: e.toString(),
        })
      }
    }
  }

  private updateInformationOnAcuity = async (
    id: number,
    appointment: AppointmentAcuityResponse,
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
      LogInfo(`AppointmentWebhookController:updateInformationOnAcuity`, `SaveToAcuitySuccessfully`, {
        ...dataForUpdate,
        acuityID: savedOnAcuity.id,
      })
    } else {
      LogInfo(`AppointmentWebhookController:updateInformationOnAcuity`, 'NoUpdateToAcuity', {
        appoinmentID: id,
      })
    }
    return dataForUpdate
  }
}

export default AppointmentWebhookController
