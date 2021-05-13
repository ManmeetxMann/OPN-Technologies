import {NextFunction, Request, Response, Router} from 'express'

//Common
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {LogError, LogInfo} from '../../../../../common/src/utils/logging-setup'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {OPNCloudTasks} from '../../../../../common/src/service/google/cloud_tasks'
//Models
import {ScheduleWebhookRequest} from '../../../models/webhook'

class AppointmentWebhookController implements IControllerBase {
  public path = '/reservation/acuity_webhook/api/v1/appointment'
  public router = Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/sync', this.createTask)
  }

  createTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {id, action, calendarID, appointmentTypeID} = req.body as ScheduleWebhookRequest
    try {
      LogInfo('AppointmentWebhookController:createTask', 'SyncRequested', {
        acuityID: id,
        calendarID,
        appointmentTypeID,
        action,
      })
      console.log(
        {
          acuityID: id,
          calendarID,
          appointmentTypeID,
          action,
        },
        '/reservation/internal/api/v1/appointments/sync-from-acuity',
      )
      res.json(actionSucceed('Task Successfully Created'))
    } catch (error) {
      //await this.appoinmentService.removeSyncInProgressForAcuity(id)
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
}

export default AppointmentWebhookController
