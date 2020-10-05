import * as express from 'express'
import {NextFunction, Request, Response} from 'express'
import {PubSub, Topic} from '@google-cloud/pubsub'

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
import {sendMessage} from '../../../common/src/service/messaging/push-notify-service'

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

  // TODO: actually test this against questionnaire "answer keys"
  private async evaluateAnswers(answers: AttestationAnswers): Promise<PassportStatuses> {
    // note that this switches us to 0-indexing
    const answerKeys = Object.keys(answers).sort((a, b) =>
      a.localeCompare(b, 'en', {numeric: true}),
    )
    const questionCount = answerKeys.length >= 13 ? 13 : answerKeys.length >= 6 ? 6 : 4
    const [values, caution, stop] = {
      4: [[1, 1, 1, 2], 1, 2],
      6: [[1, 1, 1, 1, 1, 1], 100, 1],
      13: [[2, 2, 2, 2, 1, 1, 1, 1, 1, 2, 2, 2, 100], 1, 100],
    }[questionCount]
    const score = (values as number[])
      .map((value: number, index: number) => (answers[answerKeys[index]][1] ? value : 0))
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

      // Handle no passport and pending one
      if (!existingPassport || existingPassport.status === PassportStatuses.Pending) {
        const newPassport = await this.passportService.create(
          PassportStatuses.Pending,
          userId,
          dependantIds,
          includeGuardian,
        )
        res.json(actionSucceed(newPassport))
        return
      }

      // TODO: Avoid mutation, so avoid using `let`
      let currentPassport: Passport
      if (existingPassport) {
        /*
                REMOVED (TEMPORARILY?) - THIS CALL JUST CHECKS IF A VALID PASSPORT EXISTS, DOESN'T CARE ABOUT DEPENDANTS

        // some requested dependants are not covered by this passport
        if (dependantIds.some((depId) => !existingPassport.dependantIds.includes(depId))) {
          // need to create a new one for different people
        } else
        */
        if (!isPassed(existingPassport.validUntil)) {
          // still valid, no need to recreate
          currentPassport = existingPassport
        } else if (existingPassport.status !== PassportStatuses.Proceed) {
          // only Proceed passports expire
          currentPassport = existingPassport
        }
      }
      if (!currentPassport) {
        currentPassport = await this.passportService.create(
          PassportStatuses.Pending,
          userId,
          dependantIds,
          includeGuardian,
        )
      }
      // Temporary hot fix until we're aligned on a requirement
      // Handle old passports that doesn't have `includesGuardian` flag
      res.json(
        actionSucceed({
          ...currentPassport,
          includesGuardian: currentPassport.includesGuardian ?? true,
        }),
      )
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // HOT FIX: const -> let to force the includeGuardian change
      // @ts-ignore
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
      const passportStatus = await this.evaluateAnswers(answers)
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
        if (userId) {
          const nowMillis = now().valueOf()
          this.topic.publish(Buffer.from('trace-required'), {
            userId,
            passportStatus,
            startTime: `${nowMillis - TRACE_LENGTH}`,
            endTime: `${nowMillis}`,
            organizationId,
            locationId,
            questionnaireId,
            answers: JSON.stringify(answers),
          })
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
                    tokens,
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
      const {userId, messageTitle, messageBody} = req.body
      const tokens = (await this.registrationService.findForUserIds([userId]))
        .map((reg) => reg.pushToken)
        .filter((exists) => exists)
      console.log(`${userId} has ${tokens.length} token(s): ${tokens.join()}`)
      sendMessage(messageTitle, messageBody, DEFAULT_IMAGE, tokens)
      res.json(actionSucceed({}))
    } catch (error) {
      next(error)
    }
  }
}

export default UserController
