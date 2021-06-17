import {NextFunction, Request, Response, Router} from 'express'
import {Config} from '../../../../../common/src/utils/config'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {actionSuccess} from '../../../../../common/src/utils/response-wrapper'
import {TestRunsPoolCreate} from '../../../models/test-runs-pool'
import {TestRunsPoolService} from '../../../services/test-runs-pool.service'

const testRunsPoolLimit = Config.getInt('TEST_RUNS_POOL_LIMIT')

class AdminTestRunsPoolController implements IControllerBase {
  public path = '/reservation/admin/api/v1'
  public router = Router()
  private testRunsPoolService = new TestRunsPoolService()

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

    this.router.use('/', innerRouter)
  }

  addTestRunsPool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {appointmentIds, testRunId, well} = req.body as TestRunsPoolCreate

      if (appointmentIds.length > testRunsPoolLimit) {
        throw new BadRequestException(`Number of samples are limited to ${testRunsPoolLimit}`)
      }

      const testRunPool = await this.testRunsPoolService.create({
        appointmentIds,
        testRunId,
        well,
      })

      res.json(actionSuccess({id: testRunPool.id}, 'Test run pool created successfully'))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminTestRunsPoolController
