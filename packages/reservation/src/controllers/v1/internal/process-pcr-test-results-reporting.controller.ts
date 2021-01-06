import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'

class ProcessPCRResultsReporting implements IControllerBase {
  public path = '/reservation/internal'
  public router = Router()
  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    //TODO: Add Task Validate
    innerRouter.post(this.path + '/api/v1/process-pcr-test-results', this.processPCRTestResults)

    this.router.use('/', innerRouter)
  }

  processPCRTestResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log(req.body)
      //const data = req.body as PCRTestResultRequest

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default ProcessPCRResultsReporting
