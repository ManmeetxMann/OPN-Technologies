import * as express from 'express'
import {Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {setTime} from '../../../common/src/utils/times'
import TraceListener from '../effects/executeTrace'

class RootController implements IControllerBase {
  public path = '/'
  public router = express.Router()
  private trace: TraceListener
  constructor() {
    this.trace = new TraceListener()
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.get('/', this.index)
    this.router.post('/setTime', setTime)
    // use arrow function to ensure 'this' is defined
    this.router.post('/requestTrace', (req: Request, res: Response) => this.requestTrace(req, res))
  }

  private async requestTrace(req: Request, res: Response): Promise<void> {
    try {
      console.log('Trace requested', req.body)
      await this.trace.handleMessage(req.body)
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
