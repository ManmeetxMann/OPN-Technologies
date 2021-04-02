import {NextFunction, Request, Response, Router} from 'express'
//Common
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {LogInfo, LogWarning} from '../../../../../common/src/utils/logging-setup'

//Services
import {ReservationPushService} from '../../../services/reservation-push.service'
class InternalSendAppointmentPushController implements IControllerBase {
  public path = '/reservation/internal'
  public router = Router()

  private ReservationPushService = new ReservationPushService()

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
      const executionStart = new Date().getTime()
      const upcomingPushes = await this.ReservationPushService.fetchUpcomingPushes()
      const sendPushStats = await this.ReservationPushService.sendPushUpdateScheduled(
        upcomingPushes.pushMessages,
      )
      const executionEnd = new Date().getTime()
      const executionTime = Number(executionEnd - executionStart)
      const executionTimeSec = executionTime / 1000

      if (executionTimeSec > 5) {
        LogWarning('SendAppointmentPush', 'LongExecutionTime', {executionTimeSec})
      }

      LogInfo('SendAppointmentPush', 'ExecutionStats', {
        ...upcomingPushes.selectExecutionStats,
        ...sendPushStats,
        executionTime,
      })
      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default InternalSendAppointmentPushController
