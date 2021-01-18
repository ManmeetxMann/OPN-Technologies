import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'

import {PackageService} from '../../services/package.service'

class BookingLocationController implements IControllerBase {
  public path = '/reservation/admin/api/v1/booking-locations'
  public router = Router()
  private packageService = new PackageService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.get(
      this.path + '/',
      authorizationMiddleware([RequiredUserPermission.RegUser]),
      this.getBookingLocations,
    )

    this.router.use('/', innerRouter)
  }

  getBookingLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId} = req.query as {organizationId: string}

      const results = await this.packageService.getBookingLocations(organizationId)

      res.json(actionSucceed(results))
    } catch (error) {
      next(error)
    }
  }
}

export default BookingLocationController
