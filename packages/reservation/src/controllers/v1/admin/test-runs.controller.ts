import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {isValidDate, toDateFormatWithoutTimezone} from '../../../../../common/src/utils/times'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'

import {TestRunsService} from '../../../services/test-runs.service'
import {TestRunsRequest, TestRunsPostRequest, testRunDTOResponse} from '../../../models/test-runs'
import {getIsClinicUser} from '../../../../../common/src/utils/auth'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {LabService} from '../../../services/lab.service'

class AdminTestRunsController implements IControllerBase {
  private testRunsService = new TestRunsService()
  private labService = new LabService()
  public path = '/reservation/admin/api/v1/test-runs'
  public router = Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    innerRouter.get(
      this.path,
      authorizationMiddleware([RequiredUserPermission.LabTestRunsList]),
      this.getListTestRuns,
    )
    innerRouter.post(
      this.path,
      authorizationMiddleware([RequiredUserPermission.LabTestRunsCreate]),
      this.createTestRun,
    )

    this.router.use('/', innerRouter)
  }

  getListTestRuns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {testRunDate} = req.query as TestRunsRequest
      const labId = req.headers?.labid as string

      if (testRunDate && !isValidDate(testRunDate)) {
        throw new BadRequestException('testRunDate is invalid')
      }

      const testRuns = await this.testRunsService.getTestRunsByDate(
        toDateFormatWithoutTimezone(testRunDate),
        labId,
      )

      res.json(actionSucceed(testRuns.map((testRun) => testRunDTOResponse(testRun))))
    } catch (error) {
      next(error)
    }
  }

  createTestRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {name, testRunDateTime, labId} = req.body as TestRunsPostRequest

      if (testRunDateTime && !isValidDate(testRunDateTime)) {
        throw new BadRequestException('testRunDate is invalid')
      }

      const isClinicUser = getIsClinicUser(res.locals.authenticatedUser)
      const {admin} = res.locals.authenticatedUser

      const isAdminForLab = admin.adminForLabIds && admin.adminForLabIds.includes(labId)
      if (!isAdminForLab && !isClinicUser) {
        throw new ResourceNotFoundException(`No permission to add labId [${labId}] to test run`)
      }

      const checkIfLabExists = await this.labService.findOneById(labId)
      if (!checkIfLabExists) {
        throw new ResourceNotFoundException(`No lab found for this id ${labId}`)
      }

      const testRun = await this.testRunsService.create(new Date(testRunDateTime), name, labId)

      res.json(actionSucceed(testRunDTOResponse(testRun)))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminTestRunsController
