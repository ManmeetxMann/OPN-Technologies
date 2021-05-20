import {NextFunction, Request, Response, Router} from 'express'

//Common
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed, actionSuccess} from '../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import {getUserId} from '../../../../common/src/utils/auth'

//Service
import {PCRTestResultsService} from '../../services/pcr-test-results.service'
import {TestResultsService} from '../../services/test-results.service'
import {LabService} from '../../services/lab.service'
//Models
import {singlePcrTestResultDTO, SingleTestResultsRequest} from '../../models/pcr-test-results'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {TestTypes} from '../../models/appointment'
import {Lab} from '../../models/lab'

class TestResultsController implements IControllerBase {
  public path = '/reservation/api/v1'
  public router = Router()
  private pcrTestResultsService = new PCRTestResultsService()
  private testResultsService = new TestResultsService()
  public labService = new LabService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    const regUserAuth = authorizationMiddleware([RequiredUserPermission.RegUser])

    innerRouter.get(this.path + '/test-results', regUserAuth, this.listTestResults)
    innerRouter.get(this.path + '/test-results/:id', regUserAuth, this.testResultDetails)
    innerRouter.get(this.path + '/test-results/:id/download', regUserAuth, this.getTestResultPDF)

    this.router.use('/', innerRouter)
  }

  listTestResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationid} = req.headers as {organizationid?: string}
      const {testType} = req.query as {testType?: TestTypes}

      const userId = getUserId(res.locals.authenticatedUser)
      const pcrResults = await this.pcrTestResultsService.getAllResultsByUserAndChildren(
        userId,
        organizationid,
        testType,
      )

      res.json(actionSucceed(pcrResults))
    } catch (error) {
      next(error)
    }
  }

  testResultDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {id} = req.params as SingleTestResultsRequest
      const userId = getUserId(res.locals.authenticatedUser)

      const {
        appointment,
        pcrTestResult,
      } = await this.pcrTestResultsService.getTestResultAndAppointment(id, userId)

      let lab: Lab

      if (pcrTestResult.testType !== TestTypes.RapidAntigenAtHome) {
        lab = await this.labService.findOneById(pcrTestResult.labId)
      }

      res.json(
        actionSuccess({
          ...singlePcrTestResultDTO(pcrTestResult, appointment, lab),
          isDownloadable: this.pcrTestResultsService.isDownloadable(pcrTestResult),
        }),
      )
    } catch (error) {
      next(error)
    }
  }

  getTestResultPDF = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {id} = req.params as SingleTestResultsRequest
      const userId = getUserId(res.locals.authenticatedUser)
      const {
        appointment,
        pcrTestResult,
      } = await this.pcrTestResultsService.getTestResultAndAppointment(id, userId)

      if (!this.pcrTestResultsService.isDownloadable(pcrTestResult)) {
        throw new BadRequestException(
          `PDF uploading is not supported for ${pcrTestResult.result} results`,
        )
      }

      const pdfStream = await this.testResultsService.getTestResultPDF(pcrTestResult, appointment)

      res.contentType('application/pdf')

      pdfStream.pipe(res)

      res.status(200)
    } catch (error) {
      next(error)
    }
  }
}

export default TestResultsController
