import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {getUserId} from '../../../../common/src/utils/auth'
import {PulseOxygenService} from '../../services/pulse-oxygen.service'
import {formatDateRFC822Local} from '../../utils/datetime.helper'

class PulseOxygenController implements IControllerBase {
  public router = Router()
  public path = '/reservation/api/v1'
  private pulseOxygenService = new PulseOxygenService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.get(
      this.path + '/pulse-oxygen/:id',
      authorizationMiddleware([RequiredUserPermission.RegUser], true),
      this.getPulseOxygenDetails,
    )
  }

  getPulseOxygenDetails = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {id} = req.params
      const {organizationId} = req.query
      const userId = getUserId(res.locals.authenticatedUser)

      const result = await this.pulseOxygenService.getPulseOxygenDetails(id, userId, organizationId)
      const {pulse, oxygen, timestamps, status} = result

      res.json(
        actionSucceed({
          pulse,
          oxygen,
          createdAt: formatDateRFC822Local(timestamps.createdAt),
          status: status,
        }),
      )
    } catch (error) {
      next(error)
    }
  }
}

export default PulseOxygenController
