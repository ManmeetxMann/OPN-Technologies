import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
//import {isValidISODateString} from 'iso-datestring-validator'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {PassportService} from '../services/passport-service'
import {Passport, PassportStatuses} from '../models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {Attestation, AttestationAnswers} from '../models/attestation'
import {AttestationService} from '../services/attestation-service'
import {AccessService} from '../../../access/src/service/access.service'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'
import {RegistrationService} from '../../../common/src/service/registry/registration-service'
import {UserService} from '../../../common/src/service/user/user-service'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {sendMessage} from '../../../common/src/service/messaging/push-notify-service'
import {QuestionnaireService} from '../../../lookup/src/services/questionnaire-service'
import {EvaluationCriteria} from '../../../lookup/src/models/questionnaire'
import {AlertService} from '../services/alert-service'

const DEFAULT_IMAGE =
  'https://firebasestorage.googleapis.com/v0/b/opn-platform-ca-prod.appspot.com/o/OPN-Icon.png?alt=media&token=17b833df-767d-4467-9a77-44c50aad5a33'

class UserController implements IControllerBase {
  public path = '/user'
  public router = express.Router()
  private passportService = new PassportService()
  private attestationService = new AttestationService()
  private accessService = new AccessService()
  private organizationService = new OrganizationService()
  private registrationService = new RegistrationService()
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
    this.router.post(this.path + '/status/get', this.check)
    this.router.post(this.path + '/status/update', this.update)
    this.router.post(this.path + '/testNotify', this.testNotify)
  }

  check = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Fetch passport status token
      // or create a pending one if any
      const {statusToken, userId, includeGuardian} = req.body
      const dependantIds: string[] = req.body.dependantIds ?? []
      if (!includeGuardian && dependantIds.length === 0) {
        throw new BadRequestException('Must specify at least one user (guardian and/or dependant)')
      }

      const existingPassport = statusToken
        ? await this.passportService.findOneByToken(statusToken)
        : null

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

  testNotify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {userId, messageTitle, messageBody, link} = req.body
      const tokens = (await this.registrationService.findForUserIds([userId]))
        .map((reg) => reg.pushToken)
        .filter((exists) => exists)
      if (!tokens.length) {
        throw new ResourceNotFoundException('No pushTokens found for user')
      }
      console.log(`${userId} has ${tokens.length} token(s): ${tokens.join()}`)
      sendMessage(
        messageTitle,
        messageBody,
        DEFAULT_IMAGE,
        tokens.map((token) => ({token, data: {link}})),
      )
      res.json(actionSucceed({}))
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
