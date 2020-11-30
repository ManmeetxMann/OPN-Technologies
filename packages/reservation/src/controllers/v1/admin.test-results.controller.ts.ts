import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'

import {TestResultsService} from '../../services/test-results.service'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'

import {PackageByOrganizationRequest} from '../../models/packages'
import {HttpException} from '../../../../common/src/exceptions/httpexception'
import {authMiddleware} from '../../../../common/src/middlewares/auth'

class AdminController implements IControllerBase {
  public path = '/reservation/admin'
  public router = Router()
  private testResultsService = new TestResultsService()

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

      const testResult = await this.testResultsService.getAllByOrganizationId(
        organizationId,
        dateOfAppointment,
        page,
        perPage,
      )

      res.json(actionSucceed(testResult, page))
    } catch (error) {
      next(new HttpException())
    }
  }
}

export default AdminController
