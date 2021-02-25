import {NextFunction, Request, Response, Router} from 'express'
//Common
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {getUserId} from '../../../../../common/src/utils/auth'

//Services
import {AppoinmentService} from '../../../services/appoinment.service'
import {RapidAntigenTestResultsService} from '../../../services/rapid-antigen-test-results.service'

//Models
import {RapidAntigenTestResultRequest} from '../../../models/rapid-antigen-test-results'

class AdminRapidAntigenTestTesultsController implements IControllerBase {
  public path = '/reservation/admin/api/v1'
  public router = Router()
  private appointmentService = new AppoinmentService()
  private rapidAntigenTestResultsService = new RapidAntigenTestResultsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    const sendBulkResultsAuth = authorizationMiddleware([RequiredUserPermission.LabSendBulkResults])

    innerRouter.post(
      this.path + '/rapid-antigen-test-results',
      sendBulkResultsAuth,
      this.saveRapidAntigenTestTesults,
    )
    this.router.use('/', innerRouter)
  }

  saveRapidAntigenTestTesults = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const reqeustedBy = getUserId(res.locals.authenticatedUser)
      const data = req.body as RapidAntigenTestResultRequest[]

      const response = await this.rapidAntigenTestResultsService.saveAndSendRapidAntigenTestTesults(
        data,
        reqeustedBy,
      )
      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminRapidAntigenTestTesultsController
