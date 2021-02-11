import * as express from 'express'
import {NextFunction, Request, Response} from 'express'

import IControllerBase from '../../../../common/src/interfaces/IControllerBase.interface'
import {PassportService} from '../../services/passport-service'
import {Passport, PassportStatuses} from '../../models/passport'
import {isPassed} from '../../../../common/src/utils/datetime-util'
import {actionSucceed} from '../../../../common/src/utils/response-wrapper'
import {Attestation, AttestationAnswers} from '../../models/attestation'
import {AttestationService} from '../../services/attestation-service'
import {OrganizationService} from '../../../../enterprise/src/services/organization-service'
import {BadRequestException} from '../../../../common/src/exceptions/bad-request-exception'
import {AlertService} from '../../services/alert-service'


class UserController implements IControllerBase {
  public path = '/passport/api/v1/passport'
  public router = express.Router()
  private passportService = new PassportService()
  private attestationService = new AttestationService()
  private organizationService = new OrganizationService()
  private alertService = new AlertService()

  constructor() {
    this.initRoutes()
  }

  public initRoutes(): void {
    this.router.get(this.path + '/status/get', this.check)
    this.router.post(this.path + '/status/update', this.update)
  }

  check = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Fetch passport status token
      // or create a pending one if any
      const {includeGuardian, dependantIds} = req.query
      const safeDependantIds: string[] = dependantIds ?? []
      if (!includeGuardian && safeDependantIds.length === 0) {
        throw new BadRequestException('Must specify at least one user (guardian and/or dependant)')
      }

      const mustReset = ({status, validUntil}: Passport): boolean =>
        status === PassportStatuses.Pending ||
        (isPassed(validUntil) && status === PassportStatuses.Proceed)

      if (!existingPassport || mustReset(existingPassport)) {
        const newPassport = await this.passportService.create(
          PassportStatuses.Pending,
          userId,
          dependantIds,
          includeGuardian,
        )
        res.json(actionSucceed(newPassport))
        return
      }

      // Handle old passports that doesn't have `includesGuardian` flag
      res.json(
        actionSucceed({
          ...existingPassport,
          includesGuardian: existingPassport.includesGuardian ?? true,
        }),
      )
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      /*
      //This is TEMP to allow backward compatibilty
      for (const value of Object.values(req.body.answers)) {
        if (
          (value[2] && !isValidISODateString(value[2])) ||
          (value['02'] && !isValidISODateString(value['02']))
        ) {
          throw new BadRequestException('Date string must be ISO string')
        }
      }
      */

      let {locationId, userId, includeGuardian} = req.body

      const {organizationId, questionnaireId} = await this.organizationService.getLocationById(
        locationId,
      )
      const dependantIds: string[] = req.body.dependantIds ?? []

      // HOT FIX: if missing (not actually true or false) ... force it to true for now because parents are always implicitly included
      if (includeGuardian !== true && includeGuardian !== false) {
        includeGuardian = true
        locationId = locationId
        userId = userId
      }

      if (!includeGuardian && dependantIds.length === 0) {
        throw new BadRequestException('Must specify at least one user (guardian and/or dependant)')
      }
      const answers: AttestationAnswers = req.body.answers
      let passportStatus = await this.evaluateAnswers(questionnaireId, answers)
      const appliesTo = [...dependantIds]
      if (includeGuardian) {
        appliesTo.push(userId)
      }

      const isTemperatureCheckEnabled = await this.organizationService.isTemperatureCheckEnabled(
        organizationId,
      )

      if (isTemperatureCheckEnabled && passportStatus === PassportStatuses.Proceed) {
        passportStatus = PassportStatuses.TemperatureCheckRequired
      }

      const saved = await this.attestationService.save({
        answers,
        locationId,
        userId,
        appliesTo,
        status: passportStatus,
        questionnaireId,
      } as Attestation)

      const passport = await this.passportService.create(
        passportStatus,
        userId,
        dependantIds,
        includeGuardian,
      )

      if ([PassportStatuses.Caution, PassportStatuses.Stop].includes(passportStatus)) {
        await this.alertService.sendAlert(passport, saved, organizationId, locationId)
      }

      res.json(actionSucceed(passport))
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
