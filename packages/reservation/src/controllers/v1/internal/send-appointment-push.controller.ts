import {NextFunction, Request, Response, Router} from 'express'
//Common
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {LogInfo} from '../../../../../common/src/utils/logging-setup'

//Services
import {AppointmentPushService} from '../../../services/appointment-push.service'

//Types


class InternalSendAppointmentPushController implements IControllerBase {
  public path = '/reservation/internal'
  public router = Router()

  private appointmentPushService = new AppointmentPushService()


  constructor() {
    this.initRoutes()
  }

  /**
   * TODO:
   * 1. Add Cloud Scheduler Validate by X-Appengine-QueueName header
   * 2. DB transaction
   */
  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.post(
      this.path + '/api/v1/trigger-appointments-push-reminder',
      this.triggerAppointmentsPushReminder,
    )
    this.router.use('/', innerRouter)
  }

  triggerAppointmentsPushReminder = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const upcomingPushes = await this.appointmentPushService.fetchUpcomingPushes()

      

      LogInfo('SendAppointmentPush', 'ExecutionStats', {
        ...upcomingPushes.executionStats,
      })
      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default InternalSendAppointmentPushController
