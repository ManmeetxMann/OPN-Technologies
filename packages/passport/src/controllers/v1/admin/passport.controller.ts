import * as express from 'express'
import {NextFunction, Request, Response} from 'express'

import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {UserService} from '../../../../../common/src/service/user/user-service'
import {userDTO} from '../../../../../common/src/data/user'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'

import {PassportService} from '../../../services/passport-service'
import {passportDTO} from '../../../models/passport'

import {AccessService} from '../../../../../access/src/service/access.service'
import {accessDTOResponseV1} from '../../../../../access/src/models/access'

class PassportController implements IControllerBase {
  public path = '/passport/api/v1/admin'
  public router = express.Router()
  private passportService = new PassportService()
  private userService = new UserService()
  private accessService = new AccessService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    const auth = authorizationMiddleware([RequiredUserPermission.OrgAdmin], true)
    this.router.get(this.path + '/passport', auth, this.check)
  }

  check = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {userId} = req.query as {userId: string}
      const organizationId = res.locals.organizationId as string
      const [user, passport, access] = await Promise.all([
        this.userService.findOneSilently(userId),
        this.passportService.findLatestDirectPassport(userId, organizationId),
        this.accessService.findLatestAnywhere(userId),
      ])

      if (!user?.organizationIds?.includes(organizationId))
        throw new ResourceNotFoundException(
          `No user with id ${userId} found in organization ${organizationId}`,
        )

      const response = {
        user: userDTO(user),
        passport: passport ? passportDTO(passport) : null,
        access: access ? accessDTOResponseV1(access) : null,
      }
      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }
}

export default PassportController
