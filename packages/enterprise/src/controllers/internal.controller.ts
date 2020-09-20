import * as express from 'express'
import {NextFunction, Request, Response} from 'express'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {InternalAdminApprovalCreateRequest} from '../models/internal-request'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {AdminApprovalService} from '../../../common/src/service/user/admin-service'
import {BadRequestException} from 'packages/common/src/exceptions/bad-request-exception'

class InternalController implements IControllerBase {
  public path = '/internal'
  public router = express.Router()

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
      const {
        email,
        locationIds,
        organizationId,
        superAdminForOrganizationIds,
        showReporting,
        groupIds,
      } = req.body as InternalAdminApprovalCreateRequest

      // Our service
      const adminApprovalService = new AdminApprovalService()

      // Make sure it does not exist
      const approval = await adminApprovalService.findOneByEmail(email)
      if (approval) {
        throw new BadRequestException('Unauthorized Access')
      }

      // Check if we have approval for this admin
      await adminApprovalService.create({
        email: email.toLowerCase(),
        enabled: true,
        showReporting: showReporting ?? false,
        adminForLocationIds: locationIds,
        adminForOrganizationId: organizationId,
        adminForGroupIds: groupIds ?? [],
        superAdminForOrganizationIds: superAdminForOrganizationIds ?? [],
      })
      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default InternalController
