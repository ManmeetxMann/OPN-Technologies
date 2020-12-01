import * as express from 'express'
import {Request, Response} from 'express'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {setTime} from '../../../../common/src/utils/times'

class RootController implements IControllerBase {
  public path = '/'
  public router = express.Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.get('/', this.index)
    this.router.post('/setTime', setTime)
  }

  index = (req: Request, res: Response): void => {
    res.send('')
  }
}

export default RootController
