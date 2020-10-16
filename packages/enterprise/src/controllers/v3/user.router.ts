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
  findAll,
  get,
  getAllConnectedGroupsInAnOrganization,
  getConnectedOrganizations,
  getDependents,
  getParents,
  migrate,
  removeDependent,
  update,
  updateDependent,
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
        .post('/migration', migrate)
        .post('/search', authMiddleware, findAll)
        .post('/auth', authenticate)
        .post('/auth/registration-confirmation', completeRegistration),
    )

    const dependents = innerRouter().use(
      '/dependents',
      innerRouter()
        .get('/', getDependents)
        .post('/', addDependents)
        .put('/:dependentId', updateDependent)
        .delete('/:dependentId', removeDependent),

      // TODO
      // .post('/:dependentId/organizations', connectOrganization)
      // .delete('/:dependentId/organizations/:organizationId', disconnectOrganization)

      // .post('/:dependentId/groups', connectGroup)
      // .put('/:dependentId/groups', updateGroup),
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
