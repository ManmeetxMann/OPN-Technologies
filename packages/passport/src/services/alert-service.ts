import {Topic} from '@google-cloud/pubsub'

import {Attestation, AttestationAnswers} from '../models/attestation'
import {Passport, PassportStatuses} from '../models/passport'
import {AttestationService} from '../services/attestation-service'

import {AccessService} from '../../../access/src/service/access.service'
import {User} from '../../../common/src/data/user'
import {RegistrationService} from '../../../common/src/service/registry/registration-service'
import {sendMessage} from '../../../common/src/service/messaging/push-notify-service'
import {UserService} from '../../../common/src/service/user/user-service'
import {now} from '../../../common/src/utils/times'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'

const TRACE_LENGTH = 48 * 60 * 60 * 1000
const DEFAULT_IMAGE =
  'https://firebasestorage.googleapis.com/v0/b/opn-platform-ca-prod.appspot.com/o/OPN-Icon.png?alt=media&token=17b833df-767d-4467-9a77-44c50aad5a33'

export class AlertService {
  private accessService = new AccessService()
  private attestationService = new AttestationService()
  private organizationService = new OrganizationService()
  private registrationService = new RegistrationService()
  private userService = new UserService()
  private topic: Topic

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

  async sendAlert(passport: Passport, attestation: Attestation, locationId: string): Promise<void> {
    const {status, dependantIds, includesGuardian, userId} = passport
    const {answers} = attestation

    const {organizationId, questionnaireId} = await this.organizationService.getLocationById(
      locationId,
    )

    const count = dependantIds.length + (includesGuardian ? 1 : 0)

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
            includesGuardian,
            passportStatus: status,
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
            if (includesGuardian) {
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
            const stop = status === PassportStatuses.Stop
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
                formatString.replace('__GROUPNAME', name).replace('__ORGLABEL', organizationLabel),
                icon,
                tokens.map((token) => ({token, data: {}})),
              ),
            )
          },
        )
      }
    } else {
      console.warn(
        `Could not execute a trace of attestation ${attestation.id} because userId was not provided`,
      )
    }
    await this.accessService.incrementAccessDenied(locationId, count)
  }
}
