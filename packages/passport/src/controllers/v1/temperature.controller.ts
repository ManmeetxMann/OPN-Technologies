import * as express from 'express'
import {Request, Response, NextFunction} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'

import {authMiddleware} from '../../../../common/src/middlewares/auth'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {serverTimestamp} from '../../../../common/src/utils/times'

import {User} from '../../../../common/src/data/user'

import {TemperatureSaveRequest, TemperatureStatuses} from '../../models/temperature'
import {PassportService} from '../../services/passport.service'
import {TemperatureService} from '../../services/temperature.service'
const temperatureService = new TemperatureService()
const passportService = new PassportService()

class AdminController implements IControllerBase {
  public path = '/passport/admin/api/v1'
  public router = express.Router()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/temperature', 
    // authMiddleware,
     this.saveTemperature)
  }

  public async saveTemperature(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {organizationId, locationId, temperature} = req.body as TemperatureSaveRequest
      const authenticatedUser: User = res.locals.authenticatedUser || res.locals.connectedUser || {id: '0VSax0rUuI7oyGE2YbUH'}
      const status = temperature > 37.4 ? TemperatureStatuses.Stop : TemperatureStatuses.Proceed
      const validFrom = serverTimestamp()
      console.log(validFrom)
      const data = {
        organizationId,
        locationId,
        temperature,
        status,
        userId: authenticatedUser.id,
      }
      const result = await temperatureService.save(data)

      const response = {
        status,
        userId: result.userId,
        validFrom,
        // @ts-ignore
        validUntil: passportService.shortestTime(status, new Date()),
      }

      if (status === TemperatureStatuses.Stop) {
        await passportService.create(status, data.userId, [result.id], false)
      }

      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminController
