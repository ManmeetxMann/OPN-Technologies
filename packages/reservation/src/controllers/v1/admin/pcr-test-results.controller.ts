import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {adminAuthMiddleware} from '../../../../../common/src/middlewares/admin.auth'
import {PCRTestResultsService} from '../../../services/pcr-test-results.service'
import {AppoinmentService} from '../../../services/appoinment.service'
import {
  PCRListQueryRequest,
  PCRTestResultHistoryDTO,
  PCRTestResultHistoryResponse,
  ListPCRResultRequest,
  PCRTestResultRequest,
  PCRTestResultRequestData,
  pcrTestResultsResponse,
  PcrTestResultsListRequest,
  pcrResultsResponse,
  PcrTestResultsListByDeadlineRequest,
  PCRTestResultByDeadlineListDTO,
} from '../../../models/pcr-test-results'
import moment from 'moment'
import {now} from '../../../../../common/src/utils/times'
import {Config} from '../../../../../common/src/utils/config'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {getAdminId} from '../../../../../common/src/utils/auth'

class PCRTestResultController implements IControllerBase {
  public path = '/reservation/admin'
  public router = Router()
  private pcrTestResultsService = new PCRTestResultsService()
  private appointmentService = new AppoinmentService()

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
    innerRouter.post(
      this.path + '/api/v1/pcr-test-results/history',
      adminAuthMiddleware,
      this.listPCRResultsHistory,
    )
    innerRouter.get(
      this.path + '/api/v1/pcr-test-results',
      adminAuthMiddleware,
      this.listPCRResults,
    )
    innerRouter.get(
      this.path + '/api/v1/pcr-test-results-bulk/report-status',
      adminAuthMiddleware,
      this.listPCRTestResultReportStatus,
    )
    innerRouter.get(
      this.path + '/api/v1/pcr-test-results/by-deadline',
      adminAuthMiddleware,
      this.listPCRResultsByDeadline,
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
      const sendResult = await this.pcrTestResultsService.handlePCRResultSaveAndSend({
        barCode: data.barCode,
        resultSpecs: data,
        adminId,
      })

      res.json(actionSucceed(sendResult))
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
      console.log(req.body)
      if (barcode.length > 50) {
        throw new BadRequestException('Maximum appointments to be part of request is 50')
      }

      const pcrTests = await this.pcrTestResultsService.getPCRTestsByBarcode(barcode)

      const formedPcrTests: PCRTestResultHistoryDTO[] = barcode.map((code) => {
        const testSameBarcode = pcrTests.filter((pcrTest) => pcrTest.barCode === code)
        if (testSameBarcode.length) {
          return {
            id: testSameBarcode[0].id,
            barCode: code,
            results: testSameBarcode.map((testSame) => ({
              ...testSame.resultSpecs,
              result: testSame.result,
            })),
            waitingResult: !!pcrTests.find((pcrTest) => !!pcrTest.waitingResult),
          }
        }
        return {
          id: code,
          barCode: code,
          results: [],
          waitingResult: false,
        }
      })

      res.json(actionSucceed(formedPcrTests.map(PCRTestResultHistoryResponse)))
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

  listPCRResultsByDeadline = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {deadline} = req.query as PcrTestResultsListByDeadlineRequest

      const pcrResults = await this.pcrTestResultsService.getPCRResultsByDeadline(deadline)
      const appointmentIds = pcrResults.map(({appointmentId}) => appointmentId)
      const appointments = await this.appointmentService.getAppointmentsDBByIds(appointmentIds)

      const result = pcrResults.map(
        (pcr): PCRTestResultByDeadlineListDTO => {
          const appointment = appointments.find(({id}) => pcr.appointmentId === id)
          return {
            id: pcr.id,
            barCode: appointment.barCode,
            result: pcr.result,
            vialLocation: appointment.vialLocaton,
            status: appointment.appointmentStatus,
            dateTime: appointment.dateTime,
            deadline: appointment.deadline,
            testRunId: pcr.testRunId,
          }
        },
      )

      res.json(actionSucceed(result))
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
}

export default PCRTestResultController
