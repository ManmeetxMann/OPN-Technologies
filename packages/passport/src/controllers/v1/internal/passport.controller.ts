import * as express from 'express'
import {NextFunction, Request, Response} from 'express'

import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {UserService} from '../../../../../common/src/service/user/user-service'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'

import {PassportService} from '../../../services/passport-service'

import {PassportStatuses, PassportStatus} from '../../../models/passport'
import {BadRequestException} from 'packages/common/src/exceptions/bad-request-exception'

class PassportController implements IControllerBase {
  public path = '/passport/api/v1/internal'
  public router = express.Router()
  private passportService = new PassportService()
  private userService = new UserService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/passport', this.update)
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {userId, organizationId, status} = req.body as {
        userId: string
        organizationId: string
        status: string
      }
      const user = await this.userService.findOneSilently(userId)

      if (!user?.organizationIds?.includes(organizationId))
        throw new ResourceNotFoundException(
          `No user with id ${userId} found in organization ${organizationId}`,
        )
      if (
        ![
          PassportStatuses.Caution,
          PassportStatuses.Stop,
          PassportStatuses.Proceed,
          PassportStatuses.TemperatureCheckRequired,
        ].includes(status as PassportStatuses)
      )
        throw new BadRequestException(`${status} is not a valid status`)
      await this.passportService.create(status as PassportStatus, userId, [], false, organizationId)
      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default PassportController
