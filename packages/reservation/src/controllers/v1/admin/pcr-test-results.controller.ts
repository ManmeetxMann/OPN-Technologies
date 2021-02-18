import {NextFunction, Request, Response, Router} from 'express'
import moment from 'moment'

import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {
  actionSucceed,
  actionSuccess,
  actionInProgress,
} from '../../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {now} from '../../../../../common/src/utils/times'
import {Config} from '../../../../../common/src/utils/config'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {getUserId, getIsLabUser} from '../../../../../common/src/utils/auth'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'

import {PCRTestResultsService} from '../../../services/pcr-test-results.service'
import {TestRunsService} from '../../../services/test-runs.service'

import {
  PCRListQueryRequest,
  PCRTestResultHistoryResponse,
  ListPCRResultRequest,
  PCRTestResultRequest,
  PCRTestResultRequestData,
  PcrTestResultsListRequest,
  PcrTestResultsListByDeadlineRequest,
  PCRTestResultConfirmRequest,
  SinglePcrTestResultsRequest,
  singlePcrTestResultDTO,
} from '../../../models/pcr-test-results'
import {statsUiDTOResponse} from '../../../models/appointment'
import {AppoinmentService} from '../../../services/appoinment.service'

class PCRTestResultController implements IControllerBase {
  public path = '/reservation/admin/api/v1'
  public router = Router()
  private pcrTestResultsService = new PCRTestResultsService()
  private testRunService = new TestRunsService()
  private appoinmentService = new AppoinmentService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    const sendBulkResultsAuth = authorizationMiddleware([RequiredUserPermission.LabSendBulkResults])
    const sendSingleResultsAuth = authorizationMiddleware([
      RequiredUserPermission.LabSendSingleResults,
    ])
    const dueTodayAuth = authorizationMiddleware([RequiredUserPermission.LabDueToday])
    const listTestResultsAuth = authorizationMiddleware(
      [RequiredUserPermission.LabPCRTestResults],
      true,
    )
    const confirmResultsAuth = authorizationMiddleware([RequiredUserPermission.LabConfirmResults])

    innerRouter.post(
      this.path + '/pcr-test-results-bulk',
      sendBulkResultsAuth,
      this.createReportForPCRResults,
    )
    innerRouter.post(this.path + '/pcr-test-results', sendSingleResultsAuth, this.createPCRResults)
    innerRouter.post(
      this.path + '/pcr-test-results/confirm',
      confirmResultsAuth,
      this.confirmPCRResults,
    )
    innerRouter.post(
      this.path + '/pcr-test-results/history',
      sendBulkResultsAuth,
      this.listPCRResultsHistory,
    )
    innerRouter.get(this.path + '/pcr-test-results', listTestResultsAuth, this.listPCRResults)
    innerRouter.get(
      this.path + '/pcr-test-results-bulk/report-status',
      sendBulkResultsAuth,
      this.listPCRTestResultReportStatus,
    )
    innerRouter.put(
      this.path + '/pcr-test-results/add-test-run',
      dueTodayAuth,
      this.addTestRunToPCR,
    )
    innerRouter.get(
      this.path + '/pcr-test-results/due-deadline',
      dueTodayAuth,
      this.listDueDeadline,
    )
    innerRouter.get(
      this.path + '/pcr-test-results/due-deadline/stats',
      dueTodayAuth,
      this.dueDeadlineStats,
    )
    innerRouter.get(
      this.path + '/pcr-test-results/:pcrTestResultId',
      dueTodayAuth,
      this.onePcrTestResult,
    )

    this.router.use('/', innerRouter)
  }

  createReportForPCRResults = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const adminId = getUserId(res.locals.authenticatedUser)
      const data = req.body as PCRTestResultRequest
      const timeZone = Config.get('DEFAULT_TIME_ZONE')
      const fromDate = moment(now())
        .tz(timeZone)
        .subtract(30, 'days')
        .startOf('day')
        .format('YYYY-MM-DD')
      const toDate = moment(now()).tz(timeZone).format('YYYY-MM-DD')

      if (!moment(data.resultDate).isBetween(fromDate, toDate, undefined, '[]')) {
        throw new BadRequestException(
          `Date does not match the time range (from ${fromDate} - to ${toDate})`,
        )
      }
      const reportTracker = await this.pcrTestResultsService.createReportForPCRResults(
        data,
        adminId,
      )

      res.json(actionSucceed(reportTracker))
    } catch (error) {
      next(error)
    }
  }

  createPCRResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = getUserId(res.locals.authenticatedUser)
      const {barCode, ...data} = req.body as PCRTestResultRequestData
      const timeZone = Config.get('DEFAULT_TIME_ZONE')
      const fromDate = moment(now())
        .tz(timeZone)
        .subtract(30, 'days')
        .startOf('day')
        .format('YYYY-MM-DD')
      const toDate = moment(now()).tz(timeZone).format('YYYY-MM-DD')

      if (!moment(data.resultDate).isBetween(fromDate, toDate, undefined, '[]')) {
        throw new BadRequestException(
          `Date does not match the time range (from ${fromDate} - to ${toDate})`,
        )
      }

      if (Number(data.hexCt) > 40) {
        throw new BadRequestException(`Invalid Hex Ct. Should be less than 40`)
      }

      const pcrResultRecorded = await this.pcrTestResultsService.handlePCRResultSaveAndSend(
        {
          barCode,
          resultSpecs: data,
          adminId,
        },
        true,
        data.sendUpdatedResults,
      )
      const successMessage = `For ${pcrResultRecorded.barCode}, a "${pcrResultRecorded.result}" has been  recorded and sent to the client`
      res.json(actionSuccess({id: pcrResultRecorded.id}, successMessage))
    } catch (error) {
      next(error)
    }
  }

  confirmPCRResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = getUserId(res.locals.authenticatedUser)
      const {barCode, action} = req.body as PCRTestResultConfirmRequest

      const pcrResultRecordedId = await this.pcrTestResultsService.confirmPCRResults(
        {
          barCode,
          action,
        },
        adminId,
      )
      const successMessage = `For ${barCode}, action "${action}" has been recorded and sent to the client`
      res.json(actionSuccess({id: pcrResultRecordedId}, successMessage))
    } catch (error) {
      next(error)
    }
  }

  listPCRResultsHistory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {barcode} = req.body as PCRListQueryRequest

      if (barcode.length > 50) {
        throw new BadRequestException('Maximum appointments to be part of request is 50')
      }

      const pcrTests = await this.pcrTestResultsService.getPCRTestsByBarcodeWithLinked(barcode)

      res.json(actionSucceed(pcrTests.map(PCRTestResultHistoryResponse)))
    } catch (error) {
      next(error)
    }
  }

  listPCRResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {deadline, organizationId, barCode, result} = req.query as PcrTestResultsListRequest
      if (!barCode && !deadline) {
        throw new BadRequestException('"deadline" is required if "barCode" is not specified')
      }
      const isLabUser = getIsLabUser(res.locals.authenticatedUser)

      const pcrResults = await this.pcrTestResultsService.getPCRResults(
        {
          organizationId,
          deadline,
          barCode,
          result,
        },
        isLabUser,
      )

      res.json(actionSucceed(pcrResults))
    } catch (error) {
      next(error)
    }
  }

  listPCRTestResultReportStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {reportTrackerId} = req.query as ListPCRResultRequest
      const {
        inProgress,
        pcrTestResults,
      } = await this.pcrTestResultsService.listPCRTestResultReportStatus(reportTrackerId)

      if (inProgress) {
        res.json(actionInProgress(pcrTestResults))
      } else {
        res.json(actionSucceed(pcrTestResults))
      }
    } catch (error) {
      next(error)
    }
  }

  addTestRunToPCR = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = getUserId(res.locals.authenticatedUser)

      const {
        pcrTestResultIds,
        testRunId,
      }: {
        pcrTestResultIds: string[]
        testRunId: string
      } = req.body

      if (pcrTestResultIds.length > 50) {
        throw new BadRequestException('Maximum appointments to be part of request is 50')
      }

      const testRun = await this.testRunService.getTestRunByTestRunId(testRunId)

      if (!testRun) {
        throw new ResourceNotFoundException(`Test Run with id ${testRunId} not found`)
      }

      await Promise.all(
        pcrTestResultIds.map((pcrTestResultId) =>
          this.pcrTestResultsService.addTestRunToPCR(testRunId, pcrTestResultId, adminId),
        ),
      )

      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }

  listDueDeadline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {testRunId, deadline, barCode} = req.query as PcrTestResultsListByDeadlineRequest
      if (!testRunId && !deadline && !barCode) {
        throw new BadRequestException('"testRunId" or "deadline" or "barCode" is required')
      }
      const pcrResults = await this.pcrTestResultsService.getDueDeadline({
        deadline,
        testRunId,
        barCode,
      })

      res.json(actionSucceed(pcrResults))
    } catch (error) {
      next(error)
    }
  }

  dueDeadlineStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {testRunId, deadline, barCode} = req.query as PcrTestResultsListByDeadlineRequest
      if (!testRunId && !deadline && !barCode) {
        throw new BadRequestException('"testRunId" or "deadline" or "barCode" is required')
      }
      const {
        pcrResultStatsByResultArr,
        pcrResultStatsByOrgIdArr,
        total,
      } = await this.pcrTestResultsService.getDueDeadlineStats({
        deadline,
        testRunId,
        barCode,
      })

      res.json(
        actionSucceed(
          statsUiDTOResponse(pcrResultStatsByResultArr, pcrResultStatsByOrgIdArr, total),
        ),
      )
    } catch (error) {
      next(error)
    }
  }

  onePcrTestResult = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {pcrTestResultId} = req.params as SinglePcrTestResultsRequest

      const pcrTestResult = await this.pcrTestResultsService.getPCRResultsById(pcrTestResultId)

      if (!pcrTestResult) {
        throw new ResourceNotFoundException(`PCRTestResult with id ${pcrTestResultId} not found`)
      }

      const appointment = await this.appoinmentService.getAppointmentDBById(
        pcrTestResult.appointmentId,
      )

      if (!appointment) {
        throw new ResourceNotFoundException(
          `Appointment with appointmentId ${pcrTestResult.appointmentId} not found, PCR Result id ${pcrTestResultId}`,
        )
      }

      res.json(actionSucceed(singlePcrTestResultDTO(pcrTestResult, appointment)))
    } catch (error) {
      next(error)
    }
  }
}

export default PCRTestResultController
