import {NextFunction, Request, Response, Router} from 'express'
//Common
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'

//Services
import {AppointmentPushService, AppointmentPushTypes} from '../../../services/appointment-push.service'

class InternalSendAppointmentPushController implements IControllerBase {
  public path = '/reservation/internal'
  public router = Router()
  private appointmentPushService = new AppointmentPushService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    //TODO: Add PubSUb Validate by X-Appengine-QueueName header
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
      this.appointmentPushService.sendPush(AppointmentPushTypes.before24hours)

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default InternalSendAppointmentPushController
