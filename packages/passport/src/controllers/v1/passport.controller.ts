import * as express from 'express'
import {NextFunction, Request, Response} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {PassportService} from '../../services/passport-service'
import {AttestationService} from '../../services/attestation-service'
import {OrganizationService} from '../../../../enterprise/src/services/organization-service'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {AlertService} from '../../services/alert-service'

class UserController implements IControllerBase {
  public path = '/passport/api/v1/passport'
  public router = express.Router()
  private passportService = new PassportService()
  private attestationService = new AttestationService()
  private organizationService = new OrganizationService()
  private alertService = new AlertService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.get(this.path + '/status/get', this.check)
    this.router.post(this.path + '/status/update', this.update)
  }

  check = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      throw new BadRequestException('This is a stub')
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      throw new BadRequestException('This is a stub')
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
