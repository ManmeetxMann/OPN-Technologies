import * as express from 'express'
import {NextFunction, Request, Response} from 'express'

import IControllerBase from '../../../../../common/src/interfaces/IControllerBase.interface'
import {actionSucceed} from '../../../../../common/src/utils/response-wrapper'
import {UserService} from '../../../../../common/src/service/user/user-service'
import {ResourceNotFoundException} from '../../../../../common/src/exceptions/resource-not-found-exception'
import {BadRequestException} from '../../../../../common/src/exceptions/bad-request-exception'

import {PassportService} from '../../../services/passport-service'
import {AlertService} from '../../../services/alert-service'
import {AttestationService} from '../../../services/attestation-service'

import {Passport, PassportStatuses, PassportStatus, PassportType} from '../../../models/passport'

class PassportController implements IControllerBase {
  public path = '/passport/internal/api/v1'
  public router = express.Router()
  private passportService = new PassportService()
  private alertService = new AlertService()
  private userService = new UserService()
  private attService = new AttestationService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.post(this.path + '/passport', this.update)
  }

  private async alertIfNeeded(passport: Passport, attestationId?: string | null): Promise<void> {
    const status = passport.status
    if ([PassportStatuses.Caution, PassportStatuses.Stop].includes(status as PassportStatuses)) {
      const att = attestationId ? await this.attService.getByAttestationId(attestationId) : null
      this.alertService.sendAlert(passport, att, passport.organizationId, null)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {userId, organizationId, status, attestationId, type} = req.body as {
        userId: string
        organizationId: string
        status: string
        type: string
        attestationId: string
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
      if (
        ![
          PassportType.Attestation,
          PassportType.PCR,
          PassportType.PulseOxygenCheck,
          PassportType.Temperature,
        ].includes(type as PassportType)
      )
        throw new BadRequestException(`${type} is not a valid passport type`)
      const passport = await this.passportService.create(
        status as PassportStatus,
        userId,
        [],
        false,
        organizationId,
        type as PassportType,
      )
      this.alertIfNeeded(passport, attestationId)
      res.json(actionSucceed())
    } catch (error) {
      next(error)
    }
  }
}

export default PassportController
