import * as express from 'express'
import moment from 'moment-timezone'
import {Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import TraceListener from '../effects/executeTrace'
import ReportSender from '../effects/sendReports'
import {now} from '../../../common/src/utils/times'
import {Config} from '../../../common/src/utils/config'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

class RootController implements IControllerBase {
  public path = '/'
  public router = express.Router()
  private trace: TraceListener
  private report: ReportSender
  constructor() {
    this.trace = new TraceListener()
    this.report = new ReportSender()
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.get('/', this.index)
    // this is a get because it's a cron job
    this.router.get('/triggerReports', (req: Request, res: Response) =>
      this.triggerReports(req, res),
    )
    // use arrow function to ensure 'this' is defined
    this.router.post('/requestTrace', (req: Request, res: Response) => this.requestTrace(req, res))
  }

  private async triggerReports(req: Request, res: Response): Promise<void> {
    // add 5 minutes because we'll round down
    const thisHour = moment(now()).tz(timeZone).add(5, 'minutes').hour()

    try {
      await this.report.mailForHour(thisHour)
      res.sendStatus(200)
    } catch (err) {
      console.log(err)
      res.sendStatus(500)
    }
  }

  private async requestTrace(req: Request, res: Response): Promise<void> {
    try {
      await this.trace.handleMessage(req.body.message)
      res.sendStatus(200)
    } catch (err) {
      console.log(err)
      res.sendStatus(500)
    }
  }

  index = (req: Request, res: Response): void => {
    res.send('')
  }
}

export default RootController
