import {NextFunction, Request, Response, Router} from 'express'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {actionSucceed, actionSuccess} from '../../../../../common/src/utils/response-wrapper'
import {TestRunsPoolCreate} from '../../../models/test-runs-pool'
import {TestRunsPoolService} from '../../../services/test-runs-pool.service'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {PCRTestResultsService} from '../../../services/pcr-test-results.service'
import {GetAdminScanHistoryRequest} from '../../../models/appointment'
import {getUserId} from '../../../../../common/src/utils/auth'

class AdminTestRunsPoolController implements IControllerBase {
  public path = '/reservation/admin/api/v1'
  public router = Router()
  private testRunsPoolService = new TestRunsPoolService()
  private pcrTestResultsService = new PCRTestResultsService()

  constructor() {
    this.initRoutes()
  }

  initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.post(
      this.path + '/test-runs-pools',
      authorizationMiddleware([RequiredUserPermission.LabAdmin]),
      this.addTestRunsPool,
    )

    innerRouter.get(
      this.path + '/test-runs-pools/:testRunsPoolId',
      authorizationMiddleware([RequiredUserPermission.LabAdmin]),
      this.getById,
    )

    innerRouter.put(
      this.path + '/test-runs-pools/:testRunsPoolId',
      authorizationMiddleware([RequiredUserPermission.LabAdmin]),
      this.updateTestRunsPool,
    )

    innerRouter.delete(
      this.path + '/test-runs-pools/:testRunsPoolId',
      authorizationMiddleware([RequiredUserPermission.LabAdmin]),
      this.deleteTestRunsPool,
    )

    innerRouter.put(
      this.path + '/test-runs-pools/:testRunsPoolId/add-test-result',
      authorizationMiddleware([RequiredUserPermission.LabAdmin]),
      this.addTestResultInPool,
    )

    this.router.use('/', innerRouter)
  }

  addTestRunsPool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {testResultIds, testRunId, well, numberOfSamples} = req.body as TestRunsPoolCreate

      if (testResultIds.length > numberOfSamples) {
        throw new BadRequestException(`Number of samples are limited to ${numberOfSamples}`)
      }

      const testRunPool = await this.testRunsPoolService.create({
        testResultIds,
        testRunId,
        well,
        numberOfSamples,
      })

      const responseDto = {
        ...testRunPool,
        testResults: [],
      }

      res.json(actionSuccess(responseDto, 'Test run pool created successfully'))
    } catch (error) {
      next(error)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const testRunPool = await this.testRunsPoolService.getById(req.params.testRunsPoolId)

      if (!testRunPool) {
        throw new ResourceNotFoundException('Test runs pool with given id not found')
      }

      const testResults = await this.pcrTestResultsService.getTestResultsByIds(
        testRunPool.testResultIds,
        testRunPool.testRunId,
      )

      const responseDto = {
        ...testRunPool,
        testResults,
      }

      res.json(actionSuccess(responseDto))
    } catch (error) {
      next(error)
    }
  }

  updateTestRunsPool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const testRunPool = await this.testRunsPoolService.getById(req.params.testRunsPoolId)

      if (!testRunPool) {
        throw new ResourceNotFoundException('Test runs pool with given id not found')
      }

      const {testResultIds, testRunId, well, numberOfSamples} = req.body

      if (testResultIds && testResultIds.length > testRunPool.numberOfSamples) {
        throw new BadRequestException(
          `Number of samples are limited to ${testRunPool.numberOfSamples}`,
        )
      }

      const updatedPool = await this.testRunsPoolService.update(testRunPool.id, {
        testResultIds,
        testRunId,
        well,
        numberOfSamples,
      })

      res.json(actionSuccess(updatedPool, 'Test run pool has been updated successfully'))
    } catch (error) {
      next(error)
    }
  }

  addTestResultInPool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const testResultId = req.body.testResultId
      const testRunPool = await this.testRunsPoolService.getById(req.params.testRunsPoolId)

      if (!testRunPool) {
        throw new ResourceNotFoundException('Test runs pool with given id not found')
      }

      const testResultExists = testRunPool.testResultIds.includes(testResultId)
      if (testResultExists) {
        throw new BadRequestException('Test result with given id already exists in pool')
      }

      if (testRunPool.testResultIds.length + 1 > testRunPool.numberOfSamples) {
        throw new BadRequestException(
          `Number of samples are limited to ${testRunPool.numberOfSamples}`,
        )
      }

      await this.testRunsPoolService.addTestResultInPool(testRunPool.id, testResultId)

      res.json(actionSuccess())
    } catch (error) {
      next(error)
    }
  }

  deleteTestRunsPool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.testRunsPoolService.deleteTestRunsPool(req.params.testRunsPoolId)

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default AdminTestRunsPoolController
