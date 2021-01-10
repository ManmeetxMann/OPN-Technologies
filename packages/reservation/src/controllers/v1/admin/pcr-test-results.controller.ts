import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {adminAuthMiddleware} from '../../../../../common/src/middlewares/admin.auth'
import {PCRTestResultsService} from '../../../services/pcr-test-results.service'
import {
  ListPCRResultRequest,
  PCRTestResultRequest,
  PCRTestResultRequestData,
  pcrTestResultsResponse,
  PcrTestResultsListRequest,
  pcrResultsResponse,
} from '../../../models/pcr-test-results'
import moment from 'moment'
import {now} from '../../../../../common/src/utils/times'
import {Config} from '../../../../../common/src/utils/config'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'

class PCRTestResultController implements IControllerBase {
  public path = '/reservation/admin'
  public router = Router()
  private pcrTestResultsService = new PCRTestResultsService()
  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.post(
      this.path + '/api/v1/pcr-test-results-bulk',
      adminAuthMiddleware,
      this.createReportForPCRResults,
    )
    innerRouter.post(
      this.path + '/api/v1/pcr-test-results',
      adminAuthMiddleware,
      this.createPCRResults,
    )
    innerRouter.get(
      this.path + '/api/v1/pcr-test-results',
      adminAuthMiddleware,
      this.listPCRResults,
    )
    innerRouter.get(
      this.path + '/api/v1/pcr-test-results-bulk/report-status',
      adminAuthMiddleware,
      this.listPCRTestResult,
    )

    this.router.use('/', innerRouter)
  }

  createReportForPCRResults = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = req.body as PCRTestResultRequest
      const timeZone = Config.get('DEFAULT_TIME_ZONE')
      const fromDate = moment(now()).tz(timeZone).subtract(30, 'days').startOf('day')
      const toDate = moment(now()).tz(timeZone).format('YYYY-MM-DD')

      if (!moment(data.resultDate).isBetween(fromDate, toDate, undefined, '[]')) {
        throw new BadRequestException(
          `Date does not match the time range (from ${fromDate} - to ${toDate})`,
        )
      }
      const reportTracker = await this.pcrTestResultsService.createReportForPCRResults(data)

      res.json(actionSucceed(reportTracker))
    } catch (error) {
      next(error)
    }
  }

  createPCRResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body as PCRTestResultRequestData
      const timeZone = Config.get('DEFAULT_TIME_ZONE')
      const fromDate = moment(now()).tz(timeZone).subtract(30, 'days').startOf('day')
      const toDate = moment(now()).tz(timeZone).format('YYYY-MM-DD')

      if (!moment(data.resultDate).isBetween(fromDate, toDate, undefined, '[]')) {
        throw new BadRequestException(
          `Date does not match the time range (from ${fromDate} - to ${toDate})`,
        )
      }
      const sendResult = await this.pcrTestResultsService.handlePCRResultSaveAndSend({
        barCode: data.barCode,
        resultSpecs: data,
      })

      res.json(actionSucceed(sendResult))
    } catch (error) {
      next(error)
    }
  }
  listPCRResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId, dateOfAppointment} = req.query as PcrTestResultsListRequest

      const pcrResults = await this.pcrTestResultsService.getPCRResults({
        organizationId,
        dateOfAppointment,
      })

      res.json(actionSucceed(pcrResults.map(pcrResultsResponse)))
    } catch (error) {
      next(error)
    }
  }

  listPCRTestResult = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {reportTrackerId} = req.query as ListPCRResultRequest
      const pcrTestResults = await this.pcrTestResultsService.listPCRTestResult(reportTrackerId)
      res.json(actionSucceed(pcrTestResults.map(pcrTestResultsResponse)))
    } catch (error) {
      console.log(error)
      next(error)
    }
  }
}

export default PCRTestResultController
