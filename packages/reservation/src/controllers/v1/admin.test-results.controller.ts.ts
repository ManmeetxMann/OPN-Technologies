import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'

import {TestResultsService} from '../../services/test-results.service'
import {PackageService} from '../../services/package.service'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {authMiddleware} from '../../../../common/src/middlewares/auth'

import {PackageByOrganizationRequest} from '../../models/packages'

class AdminController implements IControllerBase {
  public path = '/reservation/admin'
  public router = Router()
  private testResultsService = new TestResultsService()
  private packageService = new PackageService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.get(
      this.path + '/api/v1/test-results',
      authMiddleware,
      this.getResultsByOrganizationId,
    )

    this.router.use('/', innerRouter)
  }

  getResultsByOrganizationId = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {
        perPage,
        page,
        organizationId,
        dateOfAppointment,
      } = req.query as PackageByOrganizationRequest

      if (perPage < 1 || page < 0) {
        throw new BadRequestException(`Pagination params are invalid`)
      }
      const allpackages = await this.packageService.getAllByOrganizationId(
        organizationId,
        page,
        perPage,
      )

      if (!allpackages) {
        res.json(actionSucceed([]))
        return
      }

      const packagesId: string[] = allpackages.map(({packageCode}) => packageCode)

      const testResult = await this.testResultsService.getAllByOrganizationId(
        packagesId,
        dateOfAppointment,
      )

      res.json(actionSucceed(testResult))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController
