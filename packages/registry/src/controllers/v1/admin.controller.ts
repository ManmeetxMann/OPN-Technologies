import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {RegistrationTypes} from '../../models/registration'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {RegistrationService} from '../../services/registration-service'
import {ResourceNotFoundException} from '../../../../common/src/exceptions/resource-not-found-exception'

class AdminController implements IControllerBase {
  public path = '/admin'
  public router = express.Router()
  private registrationService = new RegistrationService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/add', this.add)
  }

  add = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Find registration
      const {registrationToken} = req.body
      const target = await this.registrationService.findOneByToken(registrationToken)
      if (!target) {
        throw new ResourceNotFoundException(
          `Cannot find registration with token [${registrationToken}]`,
        )
      }

      // Update registration
      const registration = await this.registrationService.update({
        ...target,
        type: RegistrationTypes.Admin,
      })

      res.json(actionSucceed(registration))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController
