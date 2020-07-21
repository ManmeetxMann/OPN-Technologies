import * as express from 'express'
import {Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
// import { request } from 'http'

// import Validation from '../../../common/src/utils/validation'

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
    // if (!Validation.validate(["registrationToken"], req, res))
    // {
    //     return
    // }

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
          registry: 'https://registry-staging-dot-opn-platform-dev.nn.r.appspot.com/',
          attestation: 'https://passport-staging-dot-opn-platform-dev.nn.r.appspot.com/',
          access: 'https://access-staging-dot-opn-platform-dev.nn.r.appspot.com/',
          lookup: 'https://lookup-staging-dot-opn-platform-dev.nn.r.appspot.com/',
          enterprise: 'https://enterprise-staging-dot-opn-platform-dev.nn.r.appspot.com/',
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
