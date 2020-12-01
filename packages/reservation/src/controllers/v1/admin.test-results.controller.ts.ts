import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'

import {TestResultsService} from '../../services/test-results.service'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'

import {PackageByOrganizationRequest} from '../../models/packages'
import {authMiddleware} from '../../../../common/src/middlewares/auth'
import {Config} from '../../../../common/src/utils/config'
import moment from 'moment'

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

      //TODO: Update DB to use Date instead of String from Acuity
      //Map to DB Field Format
      const timeZone = Config.get('DEFAULT_TIME_ZONE')
      const dateOfAppointmentStr = moment(dateOfAppointment).tz(timeZone).format('MMMM DD, YYYY')

      const testResult = await this.testResultsService.getAllByOrganizationId(
        organizationId,
        dateOfAppointmentStr,
        page,
        perPage,
      )

      res.json(actionSucceed(testResult, page))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController
