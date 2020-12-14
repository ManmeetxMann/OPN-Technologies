import * as express from 'express'
import {Request, Response, NextFunction} from 'express'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {authMiddleware} from '../../../../../common/src/middlewares/auth'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {now} from '../../../../../common/src/utils/times'
import {User} from '../../../../../common/src/data/user'
import {TemperatureSaveRequest, TemperatureStatuses} from '../../../models/temperature'
import {PassportService} from '../../../services/passport-service'
import {TemperatureService} from '../../../services/temperature-service'
import {Config} from '../../../../../common/src/utils/config'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'

const temperatureThreshold = Number(Config.get('TEMPERATURE_THRESHOLD'))

class TemperatureAdminController implements IControllerBase {
  public router = express.Router()
  public path = '/passport/admin/api/v1'
  public temperatureService = new TemperatureService()
  public passportService = new PassportService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/temperature', authMiddleware, this.saveTemperature)
  }

  saveTemperature = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId, locationId, temperature} = req.body as TemperatureSaveRequest
      const authenticatedUser: User = res.locals.authenticatedUser || res.locals.connectedUser

      if (!temperatureThreshold) {
        throw new BadRequestException('Threshold is not specified in config file')
      }

      const status =
        temperature > temperatureThreshold ? TemperatureStatuses.Stop : TemperatureStatuses.Proceed
      const validFrom = now()

      const data = {
        organizationId,
        locationId,
        temperature,
        status,
        userId: authenticatedUser.id,
      }
      const result = await this.temperatureService.save(data)

      const response = {
        status,
        userId: result.userId,
        validFrom,
        validUntil: this.passportService.shortestTime(status, now()),
      }

      await this.passportService.create(status, data.userId, [], false, [organizationId])

      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }
}

export default TemperatureAdminController
