import * as express from 'express'
import {Request, Response} from 'express'
import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {Config} from '../../../common/src/utils/config'
import {OpnSources} from '../../../../services-v2/libs/common/src/types/authorization'

class UserController implements IControllerBase {
  public path = ''
  public router = express.Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/', this.config)
    this.router.get(this.path + '/', this.config)
  }

  config = (req: Request, res: Response): void => {
    const opnSource: OpnSources = req.header('opn-source') as OpnSources

    let response
    if ([OpnSources.FH_Android, OpnSources.FH_IOS].includes(opnSource)) {
      response = {
        data: {
          updates: {
            ios: {
              force: '1.0.0',
              optional: '1.0.0',
              url: 'https://apps.apple.com/app/id1563779471',
            },
            android: {
              force: '1.0.0',
              optional: '1.0.0',
              url: 'https://play.google.com/store/apps/details?id=com.opntech.fhhealth',
            },
          },
          services: {
            access: Config.get('DOMAIN_ACCESS'),
            enterprise: Config.get('DOMAIN_ENTERPRISE'),
            lookup: Config.get('DOMAIN_LOOKUP'),
            passport: Config.get('DOMAIN_PASSPORT'),
            registry: Config.get('DOMAIN_REGISTRY'),
            reservation: Config.get('DOMAIN_RESERVATION'),
            cart: Config.get('DOMAIN_CHECKOUT'),
            user: Config.get('DOMAIN_USER'),
          },
          links: {
            privacyPolicy: Config.get('FH_LINK_PRIVACYPOLICY'),
            termsOfService: Config.get('FH_LINK_TERMSOFSERVICE'),
          },
          badgeValidityPeriod: 0,
          badges: {
            pending: 'Pending',
            caution: 'Caution',
            stop: 'Stop',
            proceed: 'Proceed',
          },
          publicOrg: Config.get('PUBLIC_ORG_ID'),
          publicGroup: Config.get('PUBLIC_GROUP_ID'),
          publicLocation: Config.get('PUBLIC_LOCATION_ID'),
        },
        status: 'complete',
      }
    } else {
      response = {
        data: {
          updates: {
            ios: {
              force: '1.3.3',
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
            reservation: Config.get('DOMAIN_RESERVATION'),
            cart: Config.get('DOMAIN_CHECKOUT'),
            user: Config.get('DOMAIN_USER'),
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
          publicOrg: Config.get('PUBLIC_ORG_ID'),
          publicGroup: Config.get('PUBLIC_GROUP_ID'),
          publicLocation: Config.get('PUBLIC_LOCATION_ID'),
        },
        status: 'complete',
      }
    }
    res.json(response)
  }
}

export default UserController
