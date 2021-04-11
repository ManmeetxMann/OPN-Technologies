import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'

import {OrganizationService} from '../../../services/organization-service'
import {Organization, organizationSummaryDTOResponse} from '../../../models/organization'

class AdminOrganizationController implements IControllerBase {
  public path = '/enterprise/admin'
  public router = Router()
  private organizationService = new OrganizationService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})

    innerRouter.get(
      this.path + '/api/v1/organizations',
      authorizationMiddleware([RequiredUserPermission.OPNAdmin]),
      this.getOrganizations,
    )

    innerRouter.post(
      this.path + '/api/v1/organizations',
      authorizationMiddleware([RequiredUserPermission.OPNAdmin]),
      this.createOrganization,
    )

    this.router.use('/', innerRouter)
  }

  getOrganizations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizations = await this.organizationService.getOrganizations()
      res.json(actionSucceed(organizationSummaryDTOResponse(organizations)))
    } catch (error) {
      next(error)
    }
  }

  createOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organization = await this.organizationService.create({
        ...req.body,
        enableTemperatureCheck: req.body.enableTemperatureCheck || false,
        enablePulseOxygen: req.body.enablePulseOxygen || false,
        enablePaymentForBooking: req.body.enablePaymentForBooking || false,
      } as Organization)
      res.json(actionSucceed(organization))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminOrganizationController
