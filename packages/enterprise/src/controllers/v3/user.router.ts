import * as express from 'express'
import {Router} from 'express'
import {authMiddleware} from '../../../../common/src/middlewares/auth'
import {
  addDependents,
  authenticate,
  completeRegistration,
  connectGroup,
  connectOrganization,
  create,
  disconnectGroup,
  disconnectOrganization,
  get,
  getAllConnectedGroupsInAnOrganization,
  getConnectedOrganizations,
  getDependents,
  getParents,
  removeDependent,
  update,
} from './user.handlers'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'

class UserController implements IControllerBase {
  public router = express.Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = () => Router({mergeParams: true})
    const root = '/api/v3/users'

    const authentication = innerRouter().use(
      '/',
      innerRouter()
        .post('/', create)
        .get('/auth', authenticate)
        .post('/auth/registration-confirmation', completeRegistration),
    )

    const profile = innerRouter().use(
      '/self',
      authMiddleware,
      innerRouter()
        .get('/', get)
        .put('/', update)

        .get('/organizations', getConnectedOrganizations)
        .post('/organizations', connectOrganization)
        .delete('/organizations/:organizationId', disconnectOrganization)

        .get('/groups', getAllConnectedGroupsInAnOrganization)
        .post('/groups', connectGroup)
        .delete('/groups/:groupId', disconnectGroup)

        .get('/parents', getParents)

        .get('/dependents', getDependents)
        .post('/dependents', addDependents)
        .delete('/dependents/:dependentId', removeDependent),
    )

    this.router.use(root, authentication, profile)
  }
}

export default UserController
