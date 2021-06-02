import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
//import {isValidISODateString} from 'iso-datestring-validator'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {PassportService} from '../services/passport-service'
import {Passport, PassportStatuses, PassportType} from '../models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {Attestation, AttestationAnswers} from '../models/attestation'
import {AttestationService} from '../services/attestation-service'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'
import {UserService} from '../../../common/src/service/user/user-service'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {QuestionnaireService} from '../../../lookup/src/services/questionnaire-service'
import {EvaluationCriteria} from '../../../lookup/src/models/questionnaire'
import {AlertService} from '../services/alert-service'

class UserController implements IControllerBase {
  public path = '/user'
  public router = express.Router()
  private passportService = new PassportService()
  private attestationService = new AttestationService()
  private organizationService = new OrganizationService()
  private userService = new UserService()
  private questionnaireService = new QuestionnaireService()
  // private topic: Topic
  private alertService = new AlertService()

  constructor() {
    this.initRoutes()
  }

  private async evaluateAnswers(
    questionnaireId: string,
    answers: AttestationAnswers,
  ): Promise<PassportStatuses> {
    const answerKeys = Object.keys(answers).sort((a, b) => parseInt(a) - parseInt(b))

    // note that this switches us to 0-indexing
    const responses = answerKeys.map((index) => (answers[index] ? answers[index][1] : null))

    const {
      values,
      caution,
      stop,
    }: EvaluationCriteria = await this.questionnaireService.getAnswerLogic(questionnaireId)

    const score = values
      .map((value: number, index: number) => (responses[index] ? value : 0))
      .reduce((total, current) => total + current)

    if (score >= stop) {
      return PassportStatuses.Stop
    }

    if (score >= caution) {
      return PassportStatuses.Caution
    }

    return PassportStatuses.Proceed
  }

  public initRoutes(): void {
    // TODO: deprecate
    this.router.post(this.path + '/status/get', this.checkV1)
    // TODO: deprecate
    this.router.post(this.path + '/status/update', this.update)
  }

  checkV1 = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {statusToken, userId, includeGuardian, organizationId} = req.body
      const dependantIds: string[] = req.body.dependantIds ?? []
      this.check(res, statusToken, userId, includeGuardian, organizationId, dependantIds)
    } catch (error) {
      next(error)
    }
  }
  private check = async (
    res: Response,
    statusToken: string,
    userId: string,
    includeGuardian: boolean,
    organizationId: string,
    dependantIds: string[],
    noReset = false,
  ): Promise<void> => {
    if (!includeGuardian && dependantIds.length === 0) {
      throw new BadRequestException('Must specify at least one user (guardian and/or dependant)')
    }
    let orgId = organizationId
    const existingPassport = statusToken
      ? await this.passportService.findOneByToken(statusToken)
      : null
    if (existingPassport?.organizationId) {
      if (orgId && orgId !== existingPassport.organizationId) {
        console.warn('MISMATCH: specified organization id does not match the passport')
      }
      orgId = existingPassport.organizationId
    }
    const mustReset = ({status, validUntil}: Passport): boolean =>
      noReset
        ? false
        : status === PassportStatuses.Pending ||
          (isPassed(validUntil) && status === PassportStatuses.Proceed)
    if (!existingPassport || mustReset(existingPassport)) {
      if (!orgId) {
        // need to determine based on the user
        const user = await this.userService.findOne(userId)
        const {organizationIds} = user
        if (!organizationIds?.length) {
          throw new BadRequestException('User has no organizations')
        }
        if (organizationIds.length > 1) {
          console.warn(
            `${userId} has many organizations and did not specify which one, using ${organizationIds[0]}`,
          )
        }
        orgId = organizationIds[0]
      }
      const newPassport = await this.passportService.create(
        PassportStatuses.Pending,
        userId,
        dependantIds,
        includeGuardian,
        orgId,
        PassportType.Attestation,
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

      const {organizationId} = await this.organizationService.getLocationById(locationId)
      const {questionnaireId} = await this.organizationService.findOneById(organizationId)

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
        organizationId,
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
        organizationId,
        PassportType.Attestation,
      )

      if ([PassportStatuses.Caution, PassportStatuses.Stop].includes(passportStatus)) {
        await this.alertService.sendAlert(passport.passport, saved, organizationId, locationId)
      }

      res.json(actionSucceed(passport))
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
