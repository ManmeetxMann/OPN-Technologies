import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {authMiddleware} from '../../../../common/src/middlewares/auth'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'

import {TestResultsService} from '../../services/test-results.service'
import {PackageService} from '../../services/package.service'

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

      const isPackageExist = await this.packageService.isExist(packageCode)

      if (isPackageExist) {
        throw new BadRequestException(`Package code ${packageCode} already exist`)
      }

      const results = await this.packageService.savePackage(packageCode, organizationId)

      console.warn(`${results} updated for the organization ${organizationId}`)

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController