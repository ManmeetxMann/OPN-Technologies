import * as express from 'express'
import {Router} from 'express'
import {authMiddleware} from '../../../../common/src/middlewares/auth'
import {
  addDependents,
  authenticate,
  completeRegistration,
  connectDependentToGroup,
  connectDependentToOrganization,
  connectGroup,
  connectOrganization,
  create,
  disconnectDependentOrganization,
  disconnectGroup,
  disconnectOrganization,
  get,
  getAllConnectedGroupsInAnOrganization,
  getAllDependentConnectedGroupsInAnOrganization,
  getConnectedOrganizations,
  getDependentConnectedOrganizations,
  getDependents,
  getParents,
  migrate,
  removeDependent,
  update,
  updateDependent,
  updateDependentGroup,
} from './user.handlers'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {assertHasAuthorityOnDependent} from '../../middleware/user-dependent-authority'

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
        .post('/migration', migrate)
        .post('/auth', authenticate)
        .post('/auth/registration-confirmation', completeRegistration),
    )

    const dependents = innerRouter().use(
      '/dependents',
      innerRouter().get('/', getDependents).post('/', addDependents).use(
        ':/dependentId',
        assertHasAuthorityOnDependent,
        innerRouter()
          .put('/', updateDependent)
          .delete('/', removeDependent)

          .get('/organizations', getDependentConnectedOrganizations)
          .post('/organizations', connectDependentToOrganization)
          .delete('/organizations/:organizationId', disconnectDependentOrganization)

          .get('/groups', getAllDependentConnectedGroupsInAnOrganization)
          .post('/groups', connectDependentToGroup)
          .put('/groups', updateDependentGroup),
      ),
    )

    const profile = innerRouter().use(
      '/self',
      authMiddleware,
      innerRouter()
        .get('/', get)
        .put('/', update)
        .get('/parents', getParents)

        .get('/organizations', getConnectedOrganizations)
        .post('/organizations', connectOrganization)
        .delete('/organizations/:organizationId', disconnectOrganization)

        .get('/groups', getAllConnectedGroupsInAnOrganization)
        .post('/groups', connectGroup)
        .delete('/groups/:groupId', disconnectGroup)

        .use(dependents),
    )

    this.router.use(root, authentication, profile)
  }
}

export default UserController
