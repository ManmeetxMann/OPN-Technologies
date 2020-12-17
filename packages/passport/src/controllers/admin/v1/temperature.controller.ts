import * as express from 'express'
import {Request, Response, NextFunction} from 'express'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {authMiddleware} from '../../../../../common/src/middlewares/auth'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {now} from '../../../../../common/src/utils/times'
import {TemperatureSaveRequest, TemperatureStatuses} from '../../../models/temperature'
import {PassportService} from '../../../services/passport-service'
import {TemperatureService} from '../../../services/temperature-service'
import {Config} from '../../../../../common/src/utils/config'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'
import {AttestationService} from '../../../services/attestation-service'

const temperatureThreshold = Number(Config.get('TEMPERATURE_THRESHOLD'))

class TemperatureAdminController implements IControllerBase {
  public router = express.Router()
  public path = '/passport/admin/api/v1'
  public temperatureService = new TemperatureService()
  public passportService = new PassportService()
  private attestationService = new AttestationService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/temperature', authMiddleware, this.saveTemperature)
  }

  saveTemperature = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId, temperature, userId} = req.body as TemperatureSaveRequest

      if (!temperatureThreshold) {
        throw new BadRequestException('Threshold is not specified in config file')
      }

      const status =
        temperature > temperatureThreshold ? TemperatureStatuses.Stop : TemperatureStatuses.Proceed
      const validFrom = now()

      const atestation = await this.attestationService.lastAttestationByUserId(userId)

      if (!atestation) {
        throw new BadRequestException('No attestation found for user')
      }

      const data = {
        organizationId,
        locationId: atestation.locationId,
        temperature,
        status,
        userId,
      }
      const result = await this.temperatureService.save(data)

      const response = {
        status,
        userId: result.userId,
        validFrom,
        validUntil: this.passportService.shortestTime(status, now()),
      }

      await this.passportService.create(status, data.userId, [], false)

      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }
}

export default TemperatureAdminController
