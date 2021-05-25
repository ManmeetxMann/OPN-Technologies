import {NextFunction, Request, Response, Router} from 'express'
//Common
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'

import {PCRTestResultsService} from '../../../services/pcr-test-results.service'

class InternalConfirmatoryResultReceivedController implements IControllerBase {
  public path = '/reservation/internal'
  public router = Router()
  private pcrTestResultsService = new PCRTestResultsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    //TODO: Add PubSUb Validate
    innerRouter.post(
      this.path + '/api/v1/confirmatory-results-received',
      this.confirmatoryResultHandler,
    )

    this.router.use('/', innerRouter)
  }

  confirmatoryResultHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {message} = req.body
      if (!message || !message.data) {
        throw new BadRequestException(`data is missing from pub sub post`)
      }
      await this.pcrTestResultsService.confirmatoryResult(message.data)
      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default InternalConfirmatoryResultReceivedController
