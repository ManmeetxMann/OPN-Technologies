import {NextFunction, Request, Response, Router} from 'express'
//Common
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {OPNPubSub} from '../../../../../common/src/service/google/pub_sub'

import {PCRTestResultsService} from '../../../services/pcr-test-results.service'
import {PCRTestResultConfirmRequest} from '../../../models/pcr-test-results'
import {getDateFromDatetime} from '../../../utils/datetime.helper'

class InternalMountSinaiResultReceivedController implements IControllerBase {
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

    innerRouter.post(
      this.path + '/api/v1/mount-sinai-results-received',
      this.mountSinaiResultHandler,
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
      const result = (await OPNPubSub.getPublishedData(message.data)) as PCRTestResultConfirmRequest
      await this.pcrTestResultsService.confirmPCRResults({
        barCode: result.barCode,
        action: result.action,
        labId: null,
        adminId: 'MOUNT_SINAI',
        byPassValidation: true,
      })
      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }

  mountSinaiResultHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {message} = req.body
      if (!message || !message.data) {
        throw new BadRequestException(`data is missing from pub sub post`)
      }
      const result = (await OPNPubSub.getPublishedData(message.data)) as PCRTestResultConfirmRequest
      const confirmation = this.pcrTestResultsService.getConfirmationResultForAction(result.action)

      const metaData = {
        notify: true,
        resultDate: getDateFromDatetime(new Date()),
        action: confirmation.action,
        autoResult: confirmation.finalResult,
      }

      this.pcrTestResultsService.handlePCRResultSaveAndSend({
        metaData,
        resultAnalysis: [],
        barCode: result.barCode,
        isSingleResult: true,
        sendUpdatedResults: false,
        adminId: 'MOUNT_SINAI',
        templateId: null,
        labId: null,
      })

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default InternalMountSinaiResultReceivedController
