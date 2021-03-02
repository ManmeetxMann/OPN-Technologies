import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {getUserId} from '../../../../../common/src/utils/auth'
import {TestKitBatchPostRequest} from '../../../models/test-kit-batch'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {TestKitBatchService} from '../../../services/test-kit-batch.service'

class TestKitBatchController implements IControllerBase {
  public router = Router()
  public path = '/reservation/admin/api/v1'
  private testKitBatchService = new TestKitBatchService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(
      `${this.path}/test-kit-batch`,
      authorizationMiddleware([RequiredUserPermission.TestKitBatchAdmin]),
      this.createTestKitBatch,
    )
  }

  createTestKitBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const createdBy = getUserId(res.locals.authenticatedUser)
      const testKitBatchRequestBody = req.body as TestKitBatchPostRequest
      const {id} = await this.testKitBatchService.save({...testKitBatchRequestBody, createdBy})

      res.json(actionSucceed({id}))
    } catch (error) {
      next(error)
    }
  }
}

export default TestKitBatchController
