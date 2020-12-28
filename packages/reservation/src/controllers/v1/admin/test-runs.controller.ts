import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {adminAuthMiddleware} from '../../../../../common/src/middlewares/admin.auth'
import {
  isValidDate,
  toDateFormatWithoutTimezone,
  toDateTimeFormatWithoutTimezone,
} from '../../../../../common/src/utils/times'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {TestRunsService} from '../../../services/test-runs.service'
import {TestRunsRequest, TestRunsPostRequest, testRunDTOResponse} from '../../../models/test-runs'

class TestRunsController implements IControllerBase {
  private testRunsService = new TestRunsService()
  public path = '/reservation/admin/api/v1/test-runs'
  public router = Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.get(this.path, adminAuthMiddleware, this.getListTestRuns)
    innerRouter.post(this.path, adminAuthMiddleware, this.createTestRun)

    this.router.use('/', innerRouter)
  }

  getListTestRuns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {testRunDate} = req.query as TestRunsRequest

      if (testRunDate && !isValidDate(testRunDate)) {
        throw new BadRequestException('testRunDate is invalid')
      }

      const testRuns = await this.testRunsService.getTestRunsByDate(
        toDateFormatWithoutTimezone(testRunDate),
      )

      res.json(actionSucceed(testRuns.map((testRun) => testRunDTOResponse(testRun))))
    } catch (error) {
      next(error)
    }
  }

  createTestRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {testRunDateTime} = req.body as TestRunsPostRequest

      if (testRunDateTime && !isValidDate(testRunDateTime)) {
        throw new BadRequestException('testRunDate is invalid')
      }

      const testRun = await this.testRunsService.create(
        toDateTimeFormatWithoutTimezone(testRunDateTime),
        toDateFormatWithoutTimezone(testRunDateTime),
      )

      res.json(actionSucceed(testRunDTOResponse(testRun)))
    } catch (error) {
      next(error)
    }
  }
}

export default TestRunsController
