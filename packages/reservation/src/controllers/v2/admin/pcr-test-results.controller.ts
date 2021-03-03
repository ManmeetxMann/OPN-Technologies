import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {NextFunction, Request, Response, Router} from 'express'
import {PCRTestResultsService} from '../../../services/pcr-test-results.service'
import {TestRunsService} from '../../../services/test-runs.service'
import {AppoinmentService} from '../../../services/appoinment.service'
import {getUserId} from '../../../../../common/src/utils/auth'
import {PCRTestResultRequestData} from '../../../models/pcr-test-results'
import {Config} from '../../../../../common/src/utils/config'
import moment from 'moment'
import {now} from '../../../../../common/src/utils/times'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {actionSuccess} from '../../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {TestResultRequestData} from '../../../models/test-results'
import {validateAnalysis} from '../../../utils/analysis.helper'
import {send} from '../../../../../common/src/service/messaging/send-email'

class AdminPCRTestResultController implements IControllerBase {
  public path = '/reservation/admin/api/v2'
  public router = Router()
  private pcrTestResultsService = new PCRTestResultsService()
  private testRunService = new TestRunsService()
  private appoinmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})

    const sendSingleResultsAuth = authorizationMiddleware([
      RequiredUserPermission.LabSendSingleResults,
    ])

    innerRouter.post(this.path + '/test-results', sendSingleResultsAuth, this.createPCRResults)
  }

  createPCRResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = getUserId(res.locals.authenticatedUser)
      const {barCode, resultAnalysis, sendUpdatedResults, ...metaData} = req.body as TestResultRequestData
      const timeZone = Config.get('DEFAULT_TIME_ZONE')
      const fromDate = moment(now())
        .tz(timeZone)
        .subtract(30, 'days')
        .startOf('day')
        .format('YYYY-MM-DD')
      const toDate = moment(now()).tz(timeZone).format('YYYY-MM-DD')

      if (!moment(metaData.resultDate).isBetween(fromDate, toDate, undefined, '[]')) {
        throw new BadRequestException(
          `Date does not match the time range (from ${fromDate} - to ${toDate})`,
        )
      }

      validateAnalysis(resultAnalysis)

      const pcrResultRecorded = await this.pcrTestResultsService.handleResultSaveAndSend(
        metaData,
        resultAnalysis,
        barCode,
        true,
        sendUpdatedResults,
        adminId,
      )
      const status = await this.pcrTestResultsService.getReportStatus(
        pcrResultRecorded.resultSpecs.action,
        pcrResultRecorded.result,
      )
      const successMessage = `${status} for ${pcrResultRecorded.barCode}`
      res.json(actionSuccess({id: pcrResultRecorded.id}, successMessage))
    } catch (error) {
      next(error)
    }
  }
}
