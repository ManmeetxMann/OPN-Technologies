import * as express from 'express'
import {Request, Response, NextFunction} from 'express'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {now} from '../../../../../common/src/utils/times'
import {Config} from '../../../../../common/src/utils/config'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'

import {AlertService} from '../../../../../passport/src/services/alert-service'
import {AttestationService} from '../../../../../passport/src/services/attestation-service'
import {OrganizationService} from '../../../../../enterprise/src/services/organization-service'
import {PassportService} from '../../../../../passport/src/services/passport-service'
import {TemperatureService} from '../../../services/temperature.service'

import {PassportStatuses} from '../../../../../passport/src/models/passport'
import {TemperatureSaveRequest, TemperatureStatuses} from '../../../models/temperature'

const temperatureThreshold = Number(Config.get('TEMPERATURE_THRESHOLD'))

class AdminTemperatureController implements IControllerBase {
  public router = express.Router()
  public path = '/reservation/admin/api/v1'
  public temperatureService = new TemperatureService()
  public passportService = new PassportService()
  private alertService = new AlertService()
  private attestationService = new AttestationService()
  public organizationService = new OrganizationService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(
      this.path + '/temperature',
      authorizationMiddleware([RequiredUserPermission.OrgAdmin], true),
      this.saveTemperature,
    )
  }

  saveTemperature = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {organizationId, temperature, userId} = req.body as TemperatureSaveRequest

      if (!temperatureThreshold) {
        throw new BadRequestException('Threshold is not specified in config file')
      }

      const isTemperatureCheckEnabled = await this.organizationService.isTemperatureCheckEnabled(
        organizationId,
      )

      if (!isTemperatureCheckEnabled) {
        throw new BadRequestException('Temperature check is disabled for this organization')
      }

      const status =
        temperature > temperatureThreshold ? TemperatureStatuses.Stop : TemperatureStatuses.Proceed
      const validFrom = now()

      const atestation = await this.attestationService.lastAttestationByUserId(
        userId,
        organizationId,
      )

      if (!atestation) {
        throw new BadRequestException('No attestation found for user')
      }

      if (atestation.status !== PassportStatuses.Proceed) {
        throw new BadRequestException('Attestation Status should be Proceed')
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

      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminTemperatureController
