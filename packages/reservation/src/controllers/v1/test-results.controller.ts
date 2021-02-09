import {NextFunction, Request, Response, Router} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import {getUserId} from '../../../../common/src/utils/auth'

import {PCRTestResultsService} from '../../services/pcr-test-results.service'

class TestResultController implements IControllerBase {
  public path = '/reservation/api/v1'
  public router = Router()
  private pcrTestResultsService = new PCRTestResultsService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = Router({mergeParams: true})
    const regUserAuth = authorizationMiddleware([RequiredUserPermission.RegUser])

    innerRouter.get(this.path + '/test-results', regUserAuth, this.listTestResults)

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
}

export default TestResultController
