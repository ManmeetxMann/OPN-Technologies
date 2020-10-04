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
            force: '1.2',
            optional: '1.4.1',
            url: 'https://apps.apple.com/app/opn/id1522707869',
          },
          android: {
            force: '1.2.0',
            optional: '1.2.0',
            url: 'http://play.google.com/store/apps/details?id=com.opn.app',
          },
        },
        services: {
          access: Config.get('DOMAIN_ACCESS'),
          enterprise: Config.get('DOMAIN_ENTERPRISE'),
          lookup: Config.get('DOMAIN_LOOKUP'),
          passport: Config.get('DOMAIN_PASSPORT'),
          registry: Config.get('DOMAIN_REGISTRY'),
        },
        links: {
          privacyPolicy: Config.get('LINK_PRIVACYPOLICY'),
          termsOfService: Config.get('LINK_TERMSOFSERVICE'),
        },
        badgeValidityPeriod: 0,
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
