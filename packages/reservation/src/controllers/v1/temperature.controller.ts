import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {TemperatureService} from '../../services/temperature.service'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {convertCelsiusToFahrenheit} from '../../../../common/src/utils/temperature'
import {toDateTimeFormat} from '../../../../common/src/utils/times'
import { getUserId } from '../../../../common/src/utils/auth'
import { formatDateRFC822Local } from '../../utils/datetime.helper'

class TemperatureController implements IControllerBase {
  public router = Router()
  public path = '/reservation/api/v1'
  public temperatureService = new TemperatureService()
  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.get(
      this.path + '/temperature/:id',
      authorizationMiddleware([RequiredUserPermission.RegUser], true),
      this.getTemperatureCheck,
    )
  }

  getTemperatureCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {id} = req.params
    const {organizationId} = req.query
    const userId = getUserId(res.locals.authenticatedUser)
    try {
      const result = await this.temperatureService.getTemperatureDetails(id, userId,  organizationId)
      const {status, timestamps, temperature} = result

      res.json(
        actionSucceed({
          temperatureInCelsius: temperature,
          temperatureInFahrenheit: convertCelsiusToFahrenheit(temperature),
          createdAt: formatDateRFC822Local(timestamps.createdAt),
          status: status,
        }),
      )
    } catch (error) {
      next(error)
    }
  }
}

export default TemperatureController
