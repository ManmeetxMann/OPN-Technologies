import {NextFunction, Request, Response, Router} from 'express'
import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {TemperatureService} from '../../services/temperature.service'
import {authorizationMiddleware} from '../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../common/src/types/authorization'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {convertCelsiusToFahrenheit} from '../../../../common/src/utils/temperature'
import {toDateTimeFormat} from '../../../../common/src/utils/times'

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
    try {
      const result = await this.temperatureService.getByUserIdAndOrganizationId(
        id,
        organizationId?.toString() || '',
      )
      res.json(
        actionSucceed(
          result.map((item) => {
            if (item) {
              const {status, timestamps, temperature} = item
              return {
                temperatureInCelsius: temperature,
                temperatureInFahrenheit: convertCelsiusToFahrenheit(temperature),
                createdAt: toDateTimeFormat(timestamps?.createdAt?._seconds | 0),
                status: status,
              }
            }
          }),
        ),
      )
    } catch (error) {
      next(error)
    }
  }
}

export default TemperatureController
