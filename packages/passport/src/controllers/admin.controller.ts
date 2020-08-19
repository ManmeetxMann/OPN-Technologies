import * as express from 'express'
import {Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

import Validation from '../../../common/src/utils/validation'
import {now} from '../../../common/src/utils/times'

class AdminController implements IControllerBase {
  public path = '/admin'
  public router = express.Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/status/verify', this.check)
  }

  check = (req: Request, res: Response): void => {
    if (!Validation.validate(['attestationToken'], req, res)) {
      return
    }

    const response = {
      data: {
        passport: {
          badge: 'proceed',
        },
      },
      serverTimestamp: now().toISOString(),
      status: 'complete',
    }

    res.json(response)
  }
}

export default AdminController
