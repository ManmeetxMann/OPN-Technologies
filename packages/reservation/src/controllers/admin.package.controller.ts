import {NextFunction, Request, Response, Router} from 'express'

import {ResourceNotFoundException} from 'packages/common/src/exceptions/resource-not-found-exception'
import IControllerBase from 'packages/common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from 'packages/common/src/utils/response-wrapper'
import {middlewareGenerator} from 'packages/common/src/middlewares/basic-auth'
import {Config} from 'packages/common/src/utils/config'

import {TestResultsService} from '../services/test-results.service'
import {PackageService} from '../services/package.service'

import {SavePackageAndOrganizationRequest} from '../models/packages'

import packageValidations from '../validations/package.validations'

class AdminPackageController implements IControllerBase {
  public path = '/admin'
  public router = Router()
  private packageService = new PackageService()
  private testResultsService = new TestResultsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})

    this.router.post(this.path + '/api/v1/packages', packageValidations.packageValidation, this.addPackageCode)
    this.router.use('/admin', middlewareGenerator(Config.get('RESERVATION_PASSWORD')), innerRouter)
  }

  addPackageCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {packageCode, organizationId} = req.body as SavePackageAndOrganizationRequest

      const results = await this.testResultsService.getResultsByPackageCode(packageCode)

      if (!results) {
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

export default AdminPackageController
