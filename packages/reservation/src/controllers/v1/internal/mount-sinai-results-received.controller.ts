import {NextFunction, Request, Response, Router} from 'express'
//Common
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {OPNPubSub} from '../../../../../common/src/service/google/pub_sub'

import {PCRTestResultsService} from '../../../services/pcr-test-results.service'
import {PCRTestResultConfirmRequest} from '../../../models/pcr-test-results'
import {TestResultRequestData} from '../../../models/test-results'
import {Config} from '../../../../../common/src/utils/config'
import moment from 'moment'
import {now} from '../../../../../common/src/utils/times'

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
      await this.pcrTestResultsService.confirmPCRResults({
        barCode: result.barCode,
        action: result.action,
        labId: null,
        adminId: 'MOUNT_SINAI',
        byPassValidation: true,
      })

      const {barCode, resultAnalysis, sendUpdatedResults, templateId, labId, ...metaData} =
        req.body as TestResultRequestData
      const timeZone = Config.get('DEFAULT_TIME_ZONE')
      const fromDate = moment(now())
        .tz(timeZone)
        .subtract(30, 'days')
        .startOf('day')
        .format('YYYY-MM-DD')
      const toDate = moment(now()).tz(timeZone).format('YYYY-MM-DD')

      // if (!moment(metaData.resultDate).isBetween(fromDate, toDate, undefined, '[]')) {
      //   throw new BadRequestException(
      //     `Date does not match the time range (from ${fromDate} - to ${toDate})`,
      //   )
      // }

      await this.pcrTestResultsService.handlePCRResultSaveAndSend({
        metaData,
        resultAnalysis,
        barCode,
        isSingleResult: true,
        sendUpdatedResults,
        adminId: 'MOUNT_SINAI',
        templateId,
        labId,
      })

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default InternalMountSinaiResultReceivedController
