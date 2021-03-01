import * as express from 'express'
import {Handler, Router} from 'express'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'

import {RecommendationService} from '../../services/recommendation-service'

class RecommendationController implements IControllerBase {
  public router = express.Router()
  private recService = new RecommendationService()
  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = () => Router({mergeParams: true})
    const root = '/enterprise/api/v3/recommendations'
    const auth = authorizationMiddleware([RequiredUserPermission.RegUser], true)
    const route = innerRouter().use('/', innerRouter().get('/', auth, this.getRecommendations))
    this.router.use(root, route)
  }

  getRecommendations: Handler = async (req, res, next): Promise<void> => {
    try {
      const {organizationId, authenticatedUser} = res.locals
      const recommendations = await this.recService.getRecommendations(
        authenticatedUser.id as string,
        organizationId as string,
      )
      res.json(recommendations)
    } catch (error) {
      next(error)
    }
  }
}

export default RecommendationController
