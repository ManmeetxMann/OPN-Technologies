import {NextFunction, Request, Response, Router} from 'express'

//Common
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed, actionSuccess} from '../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import {getUserId} from '../../../../common/src/utils/auth'
import {ResourceNotFoundException} from '../../../../common/src/exceptions/resource-not-found-exception'
import {LogWarning} from '../../../../common/src/utils/logging-setup'

//Service
import {AppoinmentService} from '../../services/appoinment.service'
import {PCRTestResultsService} from '../../services/pcr-test-results.service'
import {TestResultsService} from '../../services/test-results.service'
//Models
import {singlePcrTestResultDTO, SingleTestResultsRequest} from '../../models/pcr-test-results'

class TestResultsController implements IControllerBase {
  public path = '/reservation/api/v1'
  public router = Router()
  private appoinmentService = new AppoinmentService()
  private pcrTestResultsService = new PCRTestResultsService()
  private testResultsService = new TestResultsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    const regUserAuth = authorizationMiddleware([RequiredUserPermission.RegUser])

    innerRouter.get(this.path + '/test-results', regUserAuth, this.listTestResults)
    innerRouter.get(this.path + '/test-results/:id', regUserAuth, this.testResultDetails)

    this.router.use('/', innerRouter)
  }

  listTestResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationid} = req.headers as {organizationid: string}
      const userId = getUserId(res.locals.authenticatedUser)
      const pcrResults = await this.pcrTestResultsService.getTestResultsByUserId(
        userId,
        organizationid,
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
      const {isDownloadable} = req.query as {isDownloadable: string}

      const pcrTestResult = await this.pcrTestResultsService.getPCRResultsById(id)

      if (!pcrTestResult) {
        throw new ResourceNotFoundException(`PCRTestResult with id ${id} not found`)
      }

      //TODO
      if (pcrTestResult?.userId !== userId) {
        throw new ResourceNotFoundException(`${id} does not exist`)
      }

      const appointment = await this.appoinmentService.getAppointmentDBById(
        pcrTestResult.appointmentId,
      )

      if (!appointment) {
        throw new ResourceNotFoundException(
          `Appointment with appointmentId ${pcrTestResult.appointmentId} not found, PCR Result id ${id}`,
        )
      }
      if (appointment?.userId !== userId) {
        LogWarning('TestResultsController: testResultDetails', 'Unauthorized', {
          userId,
          resultId: id,
          appointmentId: pcrTestResult.appointmentId,
        })
        throw new ResourceNotFoundException(`${id} does not exist`)
      }
      let fileBuffer
      if (Boolean(isDownloadable)) {
        fileBuffer =
          (await this.testResultsService.getTestResultPDF(pcrTestResult, appointment)) || ''
      }

      res.json(
        actionSuccess(
          {...singlePcrTestResultDTO(pcrTestResult, appointment), fileBuffer},
          fileBuffer ? '' : `NotSupported Result ${pcrTestResult.result} for PDF`,
        ),
      )
    } catch (error) {
      next(error)
    }
  }
}

export default TestResultsController
