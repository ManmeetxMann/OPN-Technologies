import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'

import {authMiddleware} from '../../../../common/src/middlewares/auth'

import {TestResultsService} from '../../services/test-results.service'
import {PackageService} from '../../services/package.service'
import {ResourceNotFoundException} from '../../../../common/src/exceptions/resource-not-found-exception'

import packageValidations from '../../validations/package.validations'
import {SavePackageAndOrganizationRequest} from '../../models/packages'

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
    innerRouter.post(
      this.path + '/api/v1/packages',
      authMiddleware,
      packageValidations.packageValidation(),
      this.addPackageCode,
    )

    this.router.use('/', innerRouter)
  }

  addPackageCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {packageCode, organizationId} = req.body as SavePackageAndOrganizationRequest

      const results = await this.testResultsService.getResultsByPackageCode(packageCode)

      if (!results.length) {
        throw new ResourceNotFoundException(
          `Results are not avaiable for this packageCode: ${packageCode}`,
        )
      }

      await this.packageService.savePackage(packageCode, organizationId)

      console.warn(
        `${results.length} ${
          results.length == 1 ? 'result' : 'results'
        } updated for the organization ${organizationId}`,
      )

      res.json(actionSucceed(''))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController
