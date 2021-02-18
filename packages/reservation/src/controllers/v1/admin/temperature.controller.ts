import * as express from 'express'
import {Request, Response, NextFunction} from 'express'
import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {authorizationMiddleware} from '../../../../../common/src/middlewares/authorization'
import {RequiredUserPermission} from '../../../../../common/src/types/authorization'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {now, toDateTimeFormat} from '../../../../../common/src/utils/times'
import {convertCelsiusToFahrenheit, convertFahrenheitToCelsius} from '../../../../../common/src/utils/temperature'
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

class TemperatureAdminController implements IControllerBase {
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
    this.router.get(
      this.path + '/temperature/:id',
      authorizationMiddleware([RequiredUserPermission.RegUser], true),
      this.getTemperatureCheck,
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

      const atestation = await this.attestationService.lastAttestationByUserId(userId)

      if (!atestation) {
        throw new BadRequestException('No attestation found for user')
      }

      if (atestation.status !== PassportStatuses.TemperatureCheckRequired) {
        throw new BadRequestException('Temperature check not required for attestation')
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

      const passport = await this.passportService.create(status, data.userId, [], false)

      if (status === TemperatureStatuses.Stop) {
        await this.alertService.sendAlert(
          passport,
          atestation,
          organizationId,
          atestation.locationId,
        )
      }

      res.json(actionSucceed(response))
    } catch (error) {
      next(error)
    }
  }

  getTemperatureCheck= async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {id} = req.params;
    const {organizationId} = req.query;
    try{
      //console.log('getTemperatureCheck(): id:', id, 'organizationId: ',organizationId);
      //const result=await this.temperatureService.getByUserIdAndOrganizationId(id, organizationId+'');
      const result=[await this.temperatureService.get(id)];
      res.json(actionSucceed(
        result.map(
          (item)=>{
            if(item){
              const {status, timestamps, temperature}= item;
              return {
                temperatureInCelsius: temperature,
                temperatureInFahrenheit: convertCelsiusToFahrenheit(temperature),
                createdAt: toDateTimeFormat(timestamps?.createdAt?._seconds | 0) ,
                status: status,
              };
            }
          }
        )
      ))
    }catch(error){
      next(error);
    }
  }
}

export default TemperatureAdminController
