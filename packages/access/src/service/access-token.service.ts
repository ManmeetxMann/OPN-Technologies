import {ForbiddenException} from '../../../common/src/exceptions/forbidden-exception'
import {PassportStatuses} from '../../../passport/src/models/passport'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'
import {PassportService} from '../../../passport/src/services/passport-service'
import {Config} from '../../../common/src/utils/config'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {AccessService} from './access.service'
import {AccessModel} from '../repository/access.repository'

const permissiveMode = Config.get('FEATURE_CREATE_TOKEN_PERMISSIVE_MODE') === 'enabled'

export class AccessTokenService {
  private organizationService: OrganizationService
  private passportService: PassportService
  private accessService: AccessService

  constructor(
    organizationService: OrganizationService,
    passportService: PassportService,
    accessService: AccessService,
  ) {
    this.organizationService = organizationService
    this.passportService = passportService
    this.accessService = accessService
  }

  async createToken(
    statusToken: string,
    locationId: string,
    userId: string,
    dependantIds: string[],
    includeGuardian: boolean,
    delegateAdminUserId?: string,
  ): Promise<AccessModel> {
    const passport = await this.passportService.findOneByToken(statusToken)

    const fail = (reason: string) => {
      console.warn(reason)
      console.warn(passport)
      throw new ForbiddenException(
        'Entry into this location is not permitted based on your profile. Please contact your administrator for more information.',
      )
    }

    if (!passport) {
      fail('Access denied: status-token does not link to a passport')
    }
    if (
      !(
        passport.status === PassportStatuses.Pending ||
        (passport.status === PassportStatuses.Proceed && !isPassed(passport.validUntil))
      )
    ) {
      fail(`Access denied: passport ${passport.id} does not permit entry`)
    }
    const authorizedUserIds = new Set(passport.dependantIds ?? [])
    if (passport.includesGuardian) {
      authorizedUserIds.add(passport.userId)
    }

    const enteringDependantIds = dependantIds.filter((depId) => authorizedUserIds.has(depId))
    const enteringUserId = includeGuardian && authorizedUserIds.has(userId) ? userId : null
    if (permissiveMode) {
      if (!enteringDependantIds.length && !enteringUserId) {
        fail(`Access denied: passport ${passport.id} does not apply to any specified users`)
      } else {
        if (enteringDependantIds.length < dependantIds.length) {
          console.warn(
            `Allowing 'partial credit' entry (requested: ${dependantIds.join()} - entering: ${enteringDependantIds.join()})`,
          )
        }
        if (includeGuardian && !enteringUserId) {
          console.warn(
            `Allowing 'partial credit' entry (requested guardian: ${userId} is not authorized)`,
          )
        }
      }
    } else if (enteringDependantIds.length < dependantIds.length) {
      fail(`Access denied: passport ${passport.id} does not apply to all dependants`)
    } else if (includeGuardian && !enteringUserId) {
      fail(`Access denied: passport ${passport.id} does not apply to the guardian`)
    }

    if (!delegateAdminUserId) delegateAdminUserId = null

    const access = await this.accessService.create(
      statusToken,
      locationId,
      userId,
      !!enteringUserId, // only include guardian if the user is allowed (they might not be in permissive mode)
      enteringDependantIds,
      delegateAdminUserId,
    )

    return access
  }
}
