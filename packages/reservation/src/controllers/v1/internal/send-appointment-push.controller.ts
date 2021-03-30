import {NextFunction, Request, Response, Router} from 'express'
import moment from 'moment'
//Common
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {Config} from '../../../../../common/src/utils/config'

//Services
import {AppointmentPushService} from '../../../services/appointment-push.service'
import {AppoinmentService} from '../../../services/appoinment.service'

//Types
import {AppointmentPushTypes, PushMeta} from '../../../types/appointment-push'

class InternalSendAppointmentPushController implements IControllerBase {
  public path = '/reservation/internal'
  public router = Router()
  private appointmentService = new AppoinmentService()
  private appointmentPushService = new AppointmentPushService()
  private timeZone = Config.get('DEFAULT_TIME_ZONE')
  // DB collection maximum query size  
  private maxUntilHours = 24
  // In case push didn't worked 24 or 4 hours before appointment, send it max after: 
  private maxNotifyShiftHours = 1

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

      const nowDateTime = moment(new Date()).tz(this.timeZone)
      const untilDateTime = nowDateTime.clone().subtract(this.maxUntilHours, 'hours')
      const appointments = await this.appointmentService.getAppointmentsNotNotifiedInPeriod(
        untilDateTime,
        nowDateTime,
      )

      const appointmentsWithDate = appointments.map((appointment) => ({
        userId: appointment.userId,
        dateTime: appointment.dateTime.toDate(),
      }))

      appointmentsWithDate.forEach(appointment => {
        // appointment
        this.appointmentPushService.addPushToQueue(AppointmentPushTypes.before24hours)
      })

      await this.appointmentPushService.sendQueue()

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default InternalSendAppointmentPushController
