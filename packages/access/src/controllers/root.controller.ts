import * as express from 'express'
import moment from 'moment'
import {Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {setTime} from '../../../common/src/utils/times'
import TraceListener from '../effects/executeTrace'
import ReportSender from '../effects/sendReports'

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
    this.router.post('/setTime', setTime)
    this.router.post('/triggerReports', (req: Request, res: Response) =>
      this.triggerReports(req, res),
    )
    // use arrow function to ensure 'this' is defined
    this.router.post('/requestTrace', (req: Request, res: Response) => this.requestTrace(req, res))
  }

  private async triggerReports(req: Request, res: Response): Promise<void> {
    const {organizationId, daysAgo} = req.query

    const daysNum = parseInt(daysAgo as string | null) || 0
    const date = moment()
      .subtract(daysNum || 0, 'days')
      .format('YYYY-MM-DD')
    try {
      await this.report.mailFor(organizationId as string, date)
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
