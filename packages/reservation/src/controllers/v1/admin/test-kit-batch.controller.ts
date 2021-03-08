import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {getUserId} from '../../../../../common/src/utils/auth'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {TestKitBatchService} from '../../../services/test-kit-batch.service'

class AdminTestKitBatchController implements IControllerBase {
  public router = Router()
  public path = '/reservation/admin/api/v1'
  private testKitBatchService = new TestKitBatchService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const testKitBatchAdmin = authorizationMiddleware([RequiredUserPermission.TestKitBatchAdmin])

    this.router.get(`${this.path}/test-kit-batch`, testKitBatchAdmin, this.getTestKitBatchList)
    this.router.post(`${this.path}/test-kit-batch`, testKitBatchAdmin, this.createTestKitBatch)
  }

  getTestKitBatchList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const testKitBatchesList = await this.testKitBatchService.getAll()
      const testKitBatches = testKitBatchesList.map(({timestamps, ...fields}) => ({...fields}))

      res.json(actionSucceed(testKitBatches))
    } catch (error) {
      next(error)
    }
  }

  createTestKitBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const createdBy = getUserId(res.locals.authenticatedUser)
      const {lotNumber, hardwareName, expiry, manufacturer} = req.body
      const {id} = await this.testKitBatchService.save({
        lotNumber,
        hardwareName,
        expiry,
        manufacturer,
        createdBy,
      })

      res.json(actionSucceed({id}))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminTestKitBatchController
