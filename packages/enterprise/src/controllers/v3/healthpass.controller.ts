import * as express from 'express'
import {Handler, Router} from 'express'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'

import {HealthpassService} from '../../services/healthpass-service'

class RecommendationController implements IControllerBase {
  public router = express.Router()
  private passService = new HealthpassService()
  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = () => Router({mergeParams: true})
    const root = '/enterprise/api/v3/health-pass'
    const auth = authorizationMiddleware([RequiredUserPermission.RegUser], true)
    const route = innerRouter().use('/', innerRouter().get('/', auth, this.getHealthPass))
    this.router.use(root, route)
  }

  getHealthPass: Handler = async (req, res, next): Promise<void> => {
    try {
      const {organizationId, authenticatedUser} = res.locals
      const pass = await this.passService.getHealthPass(
        authenticatedUser.id as string,
        organizationId as string,
      )
      res.json(pass)
    } catch (error) {
      next(error)
    }
  }
}

export default RecommendationController
