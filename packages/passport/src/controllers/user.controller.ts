import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import {PubSub, Topic} from '@google-cloud/pubsub'
//import {isValidISODateString} from 'iso-datestring-validator'

import IControllerBase from '../../../common/src/interfaces/IControllerBase.interface'
import {PassportService} from '../services/passport-service'
import {Passport, PassportStatuses} from '../models/passport'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {actionSucceed} from '../../../common/src/utils/response-wrapper'
import {Attestation, AttestationAnswers} from '../models/attestation'
import {AttestationService} from '../services/attestation-service'
import {AccessService} from '../../../access/src/service/access.service'
import {Config} from '../../../common/src/utils/config'
import {now} from '../../../common/src/utils/times'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'
import {RegistrationService} from '../../../common/src/service/registry/registration-service'
import {UserService} from '../../../common/src/service/user/user-service'
import {User} from '../../../common/src/data/user'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {sendMessage} from '../../../common/src/service/messaging/push-notify-service'
import {QuestionnaireService} from '../../../lookup/src/services/questionnaire-service'
import {EvaluationCriteria} from '../../../lookup/src/models/questionnaire'

const TRACE_LENGTH = 48 * 60 * 60 * 1000
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
  private topic: Topic

  constructor() {
    this.initRoutes()
    try {
      const pubsub = new PubSub()
      pubsub
        .createTopic(Config.get('PUBSUB_TRACE_TOPIC'))
        .catch((err) => {
          if (err.code !== 6) {
            throw err
          }
        })
        .then(() => {
          this.topic = pubsub.topic(Config.get('PUBSUB_TRACE_TOPIC'))
        })
    } catch (error) {
      if (error.code !== 6) throw error
    }
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

    const score = (values as number[])
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

  private dateFromAnswer(answer: Record<number, boolean | string>): Date | null {
    const answerKeys = Object.keys(answer).sort((a, b) => parseInt(a) - parseInt(b))
    if (!answerKeys[0]) {
      // answer was false, no relevant date
      return null
    }
    if (answerKeys.length === 1) {
      // no follow up answer
      return null
    }
    if (typeof answer[answerKeys[1]] !== 'string') {
      // no follow up answer
      return null
    }
    const date = new Date(answer[answerKeys[1]])
    if (isNaN(date.getTime())) {
      console.warn(`${answer[answerKeys[1]]} is not a parseable date`)
      return null
    }
    return date
  }

  private findTestDate(answers: AttestationAnswers): Date | null {
    const earliestDate = Object.values(answers)
      .map(this.dateFromAnswer)
      .reduce((earliest, curr) => {
        if (!curr) {
          return earliest
        }
        if (!earliest) {
          return curr
        }
        if (curr < earliest) {
          return curr
        }
        return earliest
      })
    return earliestDate
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
      const passportStatus = await this.evaluateAnswers(questionnaireId, answers)
      const appliesTo = [...dependantIds]
      if (includeGuardian) {
        appliesTo.push(userId)
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

      // Stats
      const count = dependantIds.length + (includeGuardian ? 1 : 0)
      await this.accessService.incrementTodayPassportStatusCount(locationId, passportStatus, count)
      if ([PassportStatuses.Caution, PassportStatuses.Stop].includes(passportStatus)) {
        const dateOfTest = this.findTestDate(answers)
        if (userId) {
          const endTime = now().valueOf()
          // if we have a test datetime, start the trace 48 hours before the test date
          // otherwise, start the trace 48 hours before now
          // The frontends default to sending the very start of the day
          const startTime = (dateOfTest ? dateOfTest.valueOf() : endTime) - TRACE_LENGTH
          this.topic.publish(
            Buffer.from(
              JSON.stringify({
                userId,
                dependantIds: dependantIds,
                includesGuardian: includeGuardian,
                passportStatus,
                startTime,
                endTime,
                organizationId,
                locationId,
                questionnaireId,
                answers: answers,
              }),
            ),
          )
          const organization = await this.organizationService.findOneById(organizationId)
          if (organization.enablePushNotifications) {
            //do not await here, this is a side effect
            this.userService.findHealthAdminsForOrg(organizationId).then(
              async (healthAdmins: User[]): Promise<void> => {
                const ids = healthAdmins.map(({id}) => id)
                if (!ids && ids.length) {
                  return
                }
                const tokens = (await this.registrationService.findForUserIds(ids))
                  .map((reg) => reg.pushToken)
                  .filter((exists) => exists)
                const relevantUserIds = [...dependantIds]
                if (includeGuardian) {
                  relevantUserIds.push(userId)
                }
                const groups = await this.organizationService.getUsersGroups(
                  organizationId,
                  null,
                  relevantUserIds,
                )
                const allGroups = await this.organizationService.getGroups(organizationId)
                const groupNames = groups.map(
                  (group) => allGroups.find(({id}) => id === group.groupId).name,
                )
                const stop = passportStatus === PassportStatuses.Stop
                const defaultFormat = stop
                  ? 'Someone in "__GROUPNAME" received a STOP badge. Tap to view admin dashboard. (__ORGLABEL)'
                  : 'Someone in "__GROUPNAME" received a CAUTION badge. Tap to view admin dashboard. (__ORGLABEL)'
                const organizationIcon = stop
                  ? organization.notificationIconStop
                  : organization.notificationIconCaution
                const icon = organizationIcon ?? DEFAULT_IMAGE

                const formatString =
                  (stop
                    ? organization.notificationFormatStop
                    : organization.notificationFormatCaution) ?? defaultFormat

                const organizationLabel = organization.key.toString()

                groupNames.forEach((name) =>
                  sendMessage(
                    '⚠️ Potential Exposure',
                    formatString
                      .replace('__GROUPNAME', name)
                      .replace('__ORGLABEL', organizationLabel),
                    icon,
                    tokens.map((token) => ({token, data: {}})),
                  ),
                )
              },
            )
          }
        } else {
          console.warn(
            `Could not execute a trace of attestation ${saved.id} because userId was not provided`,
          )
        }
        await this.accessService.incrementAccessDenied(locationId, count)
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
