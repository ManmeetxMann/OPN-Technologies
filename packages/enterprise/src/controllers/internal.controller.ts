import * as express from 'express'
import {Request, Response, NextFunction} from 'express'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'

import {AuthService} from '../../../common/src/service/auth/auth-service'
import {InternalAdminApprovalCreateRequest} from '../models/internal-request'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {AdminApprovalService} from '../../../common/src/service/user/admin-service'

class InternalController implements IControllerBase {
  public path = '/internal'
  public router = express.Router()
  private authService = new AuthService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/adminApproval/create', this.internalAdminApprovalCreate)
  }

  internalAdminApprovalCreate = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {email, organizationId, locationId} = req.body as InternalAdminApprovalCreateRequest

      // Check if we have approval for this admin
      const adminApprovalService = new AdminApprovalService()
      await adminApprovalService.create({
        email: email.toLowerCase(),
        enabled: true,
        adminForLocationIds: [`organizations/${organizationId}/locations/${locationId}`],
        superAdminForOrganizationIds: [],
      })
      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default InternalController
