import {NextFunction, Request, Response, Router} from 'express'
import moment from 'moment'

import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed, actionSuccess} from '../../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {now} from '../../../../../common/src/utils/times'
import {Config} from '../../../../../common/src/utils/config'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {getAdminId} from '../../../../../common/src/utils/auth'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'

import {PCRTestResultsService} from '../../../services/pcr-test-results.service'
import {TestRunsService} from '../../../services/test-runs.service'
import {flatten} from 'lodash'

import {
  PCRListQueryRequest,
  PCRTestResultHistoryDTO,
  PCRTestResultHistoryResponse,
  ListPCRResultRequest,
  PCRTestResultRequest,
  PCRTestResultRequestData,
  pcrTestResultsResponse,
  PcrTestResultsListRequest,
  PcrTestResultsListByDeadlineRequest,
} from '../../../models/pcr-test-results'

class PCRTestResultController implements IControllerBase {
  public path = '/reservation/admin'
  public router = Router()
  private pcrTestResultsService = new PCRTestResultsService()
  private testRunService = new TestRunsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    const sendResultsAuth = authorizationMiddleware([RequiredUserPermission.LabSendResults])
    const dueTodayAuth = authorizationMiddleware([RequiredUserPermission.LabDueToday])
    const testResultsAuth = authorizationMiddleware([RequiredUserPermission.LabSendResults], true)

    innerRouter.post(
      this.path + '/api/v1/pcr-test-results-bulk',
      sendResultsAuth,
      this.createReportForPCRResults,
    )
    innerRouter.post(this.path + '/api/v1/pcr-test-results', sendResultsAuth, this.createPCRResults)
    innerRouter.post(
      this.path + '/api/v1/pcr-test-results/history',
      sendResultsAuth,
      this.listPCRResultsHistory,
    )
    innerRouter.get(this.path + '/api/v1/pcr-test-results', testResultsAuth, this.listPCRResults)
    innerRouter.get(
      this.path + '/api/v1/pcr-test-results-bulk/report-status',
      sendResultsAuth,
      this.listPCRTestResultReportStatus,
    )
    innerRouter.put(
      this.path + '/api/v1/pcr-test-results/add-test-run',
      dueTodayAuth,
      this.addTestRunToPCR,
    )
    innerRouter.get(
      this.path + '/api/v1/pcr-test-results/due-deadline',
      dueTodayAuth,
      this.listDueDeadline,
    )

    this.router.use('/', innerRouter)
  }

  createReportForPCRResults = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const adminId = getAdminId(res.locals.authenticatedUser)
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
      const adminId = getAdminId(res.locals.authenticatedUser)
      const data = req.body as PCRTestResultRequestData
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
          barCode: data.barCode,
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

      const formedPcrTests: PCRTestResultHistoryDTO[] = await Promise.all(
        barcode.map(async (code) => {
          const testSameBarcode = pcrTests.filter((pcrTest) => pcrTest.barCode === code)
          const results = flatten(
            testSameBarcode.map((testSame) => {
              const linkedSameTests = testSame.linkedResults.map((linkedResult) => ({
                ...linkedResult.resultSpecs,
                result: linkedResult.result,
              }))
              return [
                {
                  ...testSame.resultSpecs,
                  result: testSame.result,
                },
                ...linkedSameTests,
              ]
            }),
          )
          // const waitingResult = !!pcrTests.find(
          //   (pcrTest) => pcrTest.barCode === code && !!pcrTest.waitingResult,
          // )
          const pcrTest = pcrTests.find((pcrTest) => pcrTest.barCode === code)
          const waitingResult = !!pcrTest.waitingResult

          if (testSameBarcode.length) {
            if (testSameBarcode.length > 1) {
              console.log(`Warning tests with same barcode are more than one. Barcode: ${code}.`)
            }
            return {
              id: testSameBarcode[0].id,
              barCode: code,
              results: pcrTest ? [] : results,
              waitingResult,
              ...(!waitingResult && {reason: await this.pcrTestResultsService.getReason(code)}),
              reSampleNumber: pcrTest.reSampleNumber,
              runNumber: pcrTest.runNumber,
            }
          }
          return {
            id: code,
            barCode: code,
            results: [],
            waitingResult: false,
            reason: await this.pcrTestResultsService.getReason(code),
            reSampleNumber: pcrTest.reSampleNumber,
            runNumber: pcrTest.runNumber,
          }
        }),
      )

      res.json(actionSucceed(formedPcrTests.map(PCRTestResultHistoryResponse)))
    } catch (error) {
      next(error)
    }
  }

  listPCRResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {deadline, organizationId, barCode} = req.query as PcrTestResultsListRequest

      if (!barCode && !deadline) {
        throw new BadRequestException('"deadline" is required if "barCode" is not specified')
      }

      const pcrResults = await this.pcrTestResultsService.getPCRResults({
        organizationId,
        deadline,
        barCode,
      })

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
      const pcrTestResults = await this.pcrTestResultsService.listPCRTestResultReportStatus(
        reportTrackerId,
      )
      res.json(actionSucceed(pcrTestResults.map(pcrTestResultsResponse)))
    } catch (error) {
      console.log(error)
      next(error)
    }
  }

  addTestRunToPCR = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = getAdminId(res.locals.authenticatedUser)

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
      const {testRunId, deadline} = req.query as PcrTestResultsListByDeadlineRequest

      const pcrResults = await this.pcrTestResultsService.getDueDeadline({deadline, testRunId})

      res.json(actionSucceed(pcrResults))
    } catch (error) {
      next(error)
    }
  }
}

export default PCRTestResultController
