import * as express from 'express'
import {Router} from 'express'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'

// import {OrganizationService} from '../../services/organization-service'

class RecommendationController implements IControllerBase {
  public router = express.Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    // const innerRouter = () => Router({mergeParams: true})
    // const root = '/enterprise/admin/api/v3/users'
    // const requireAdminWithOrg = authorizationMiddleware([RequiredUserPermission.OrgAdmin], true)
    // const route = innerRouter().use(
    //   '/',
    //   innerRouter()
    //     .get('/', requireAdminWithOrg, getUsersByOrganizationId)
    // )
    // this.router.use(root, route)
  }
}

export default RecommendationController
