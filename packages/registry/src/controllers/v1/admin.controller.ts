import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
// import {RegistrationService} from '../../../../common/src/service/registry/registration-service'

import * as express from 'express'
import {NextFunction, Request, Response} from 'express'

class AdminController implements IControllerBase {
  public path = '/admin'
  public router = express.Router()
  // private registrationService = new RegistrationService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/add', this.add)
  }

  add = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      /*
      // Find registration
      const {registrationToken} = req.body
      const target = await this.registrationService.findOneByToken(registrationToken)
      if (!target) {
        // Commented exception and don't allow for update...
        // TODO: Fix this in coordination with app
        // https://github.com/OPN-Technologies/services/issues/383
        // throw new ResourceNotFoundException(
        //   `Cannot find registration with token [${registrationToken}]`,
        // )
        console.error(`Cannot find registration with token [${registrationToken}]`)
      }

      // Update registration
      // TODO: Remove conditional when this is fixed
      if (!!target) {
        const registration = await this.registrationService.update({
          ...target,
          type: RegistrationTypes.Admin,
        })

        res.json(actionSucceed(registration))
      } else {
        res.json(actionSucceed())
      }
      */

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController
