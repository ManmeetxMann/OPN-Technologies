import * as express from 'express'
import {Handler, Router} from 'express'
import {authMiddleware} from '../../../../common/src/middlewares/auth'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {UserService} from '../../services/user-service'
import {OrganizationService} from '../../services/organization-service'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {User} from '../../models/user'
import {PageableRequestFilter} from '../../../../common/src/types/request'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'

const userService = new UserService()
const organizationService = new OrganizationService()

/**
 * Get all users for a given org-id
 * Paginated result will be returned
 */
const getUsersByOrganizationId: Handler = async (req, res, next): Promise<void> => {
  try {
    const {organizationId} = req.params
    const {perPage, page} = req.query as PageableRequestFilter

    if (perPage < 1 || page < 0) {
      throw new BadRequestException(`Pagination params are invalid`)
    }

    const users = await userService.getAllByOrganizationId(organizationId, page, perPage)

    const resultUsers = await Promise.all(
      users.map(async (user: User) => {
        const userGroup = await organizationService.getUserGroup(organizationId, user.id)
        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: user.photo,
          groupName: userGroup.name,
          memberId: user.memberId,
        }
      }),
    )
    res.json(actionSucceed(resultUsers, page))
  } catch (error) {
    next(error)
  }
}

class AdminUserController implements IControllerBase {
  public router = express.Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const innerRouter = () => Router({mergeParams: true})
    const root = '/enterprise/admin/api/v3/users'

    const route = innerRouter().use(
      '/',
      innerRouter().get('/:organizationId', authMiddleware, getUsersByOrganizationId),
    )

    this.router.use(root, route)
  }
}

export default AdminUserController
