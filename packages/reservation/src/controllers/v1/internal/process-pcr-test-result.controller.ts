import {NextFunction, Request, Response, Router} from 'express'
import { ProcessPCRResultRequest } from 'packages/reservation/src/models/pcr-test-results'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {PCRTestResultsService} from '../../../services/pcr-test-results.service'

class ProcessPCRResultController implements IControllerBase {
  public path = '/reservation/internal'
  public router = Router()
  private pcrTestResultsService = new PCRTestResultsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    //TODO: Add Task Validate
    innerRouter.post(this.path + '/api/v1/process-pcr-test-result', this.processPCRTestResult)

    this.router.use('/', innerRouter)
  }

  processPCRTestResult = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {reportTrackerId, resultId} = req.body as ProcessPCRResultRequest
      await this.pcrTestResultsService.processPCRTestResult(reportTrackerId,resultId)
      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default ProcessPCRResultController
