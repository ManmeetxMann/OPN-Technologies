import * as express from 'express'
import {Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {Config} from '../../../common/src/utils/config'

class UserController implements IControllerBase {
  public path = ''
  public router = express.Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/', this.config)
  }

  config = (req: Request, res: Response): void => {
    const response = {
      data: {
        updates: {
          ios: {
            force: '0.1',
            optional: '0.1',
            url: 'http://itunes.com/apps/opn',
          },
          android: {
            force: '1.0.0',
            optional: '1.0.0',
            url: 'http://play.google.com/store/apps/details?id=com.opn.app',
          },
        },
        services: {
          access: Config('DOMAIN_ACCESS'),
          enterprise: Config('DOMAIN_ENTERPRISE'),
          lookup: Config('DOMAIN_LOOKUP'),
          passport: Config('DOMAIN_PASSPORT'),
          registry: Config('DOMAIN_REGISTRY'),
        },
        badgeValidityPeriod: 60 * 60 * 24,
        badges: {
          pending: 'Pending',
          caution: 'Caution',
          stop: 'Stop',
          proceed: 'Proceed',
        },
      },
      status: 'complete',
    }

    res.json(response)
  }
}

export default UserController
