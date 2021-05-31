import * as express from 'express'
import {Request, Response, NextFunction} from 'express'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {now} from '../../../../../common/src/utils/times'
import {Config} from '../../../../../common/src/utils/config'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'

import {AttestationService} from '../../../../../passport/src/services/attestation-service'
import {OrganizationService} from '../../../../../enterprise/src/services/organization-service'
import {PassportService} from '../../../../../passport/src/services/passport-service'
import {TemperatureService} from '../../../services/temperature.service'
import {PulseOxygenService} from '../../../services/pulse-oxygen.service'

import {PassportStatuses, PassportType} from '../../../../../passport/src/models/passport'
import {PulseOxygenStatuses} from '../../../../../reservation/src/models/pulse-oxygen'
import {TemperatureSaveRequest, TemperatureStatuses} from '../../../models/temperature'

import PassportAdapter from '../../../../../common/src/adapters/passport'
import {getUserId} from '../../../../../common/src/utils/auth'

const temperatureThreshold = Number(Config.get('TEMPERATURE_THRESHOLD'))
const oxygenThreshold = Number(Config.get('OXYGEN_THRESHOLD'))

class AdminTemperatureController implements IControllerBase {
  public router = express.Router()
  public path = '/reservation/admin/api/v1'
  public temperatureService = new TemperatureService()
  public pulseOxygenService = new PulseOxygenService()
  public passportService = new PassportService()
  private attestationService = new AttestationService()
  public organizationService = new OrganizationService()
  private passportAdapter = new PassportAdapter()

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
      const {
        organizationId,
        temperature,
        pulse,
        oxygen,
        userId,
      } = req.body as TemperatureSaveRequest
      const createdBy = getUserId(res.locals.authenticatedUser)

      if (!temperatureThreshold) {
        throw new BadRequestException('Temperature Threshold is not specified in config file')
      }

      if (!oxygenThreshold) {
        throw new BadRequestException('Oxygen Threshold is not specified in config file')
      }

      const isTemperatureCheckEnabled = await this.organizationService.isTemperatureCheckEnabled(
        organizationId,
      )

      if (!isTemperatureCheckEnabled) {
        throw new BadRequestException('Temperature check is disabled for this organization')
      }

      const isHighTemperatureStatus = temperature > temperatureThreshold
      const isLowOxygenStatus = oxygen < oxygenThreshold

      // final status which will update passport
      const temperatureOxygenStatus =
        isHighTemperatureStatus || isLowOxygenStatus
          ? PassportStatuses.Stop
          : PassportStatuses.Proceed

      const validFrom = now()

      const attestation = await this.attestationService.lastAttestationByUserId(
        userId,
        organizationId,
      )

      if (!attestation) {
        throw new BadRequestException('No attestation found for user')
      }

      if (attestation.status !== PassportStatuses.Proceed) {
        throw new BadRequestException('Attestation Status should be Proceed')
      }

      const temperatureResult = await this.temperatureService.save({
        organizationId,
        locationId: attestation.locationId,
        temperature,
        status: isHighTemperatureStatus ? TemperatureStatuses.Stop : TemperatureStatuses.Proceed,
        userId,
        createdBy,
      })

      await this.pulseOxygenService.savePulseOxygenStatus({
        pulse,
        oxygen,
        locationId: attestation.locationId,
        organizationId,
        status: isLowOxygenStatus ? PulseOxygenStatuses.Failed : PulseOxygenStatuses.Passed,
        userId,
      })

      await this.passportAdapter.createPassport(
        userId,
        organizationId,
        temperatureOxygenStatus,
        PassportType.Temperature,
      )

      const response = {
        status: temperatureOxygenStatus,
        userId: temperatureResult.userId,
        validFrom,
        validUntil: this.passportService.shortestTime(temperatureOxygenStatus, now(), false),
      }

      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }
}

export default AdminTemperatureController
