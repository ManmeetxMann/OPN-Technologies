import {Access} from '../models/access'
import {ForbiddenException} from '../../../common/src/exceptions/forbidden-exception'
import {PassportStatuses} from '../../../passport/src/models/passport'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'
import {PassportService} from '../../../passport/src/services/passport-service'
import {Config} from '../../../common/src/utils/config'
import {isPassed} from '../../../common/src/utils/datetime-util'
import {AccessService} from './access.service'

const permissiveMode = Config.get('FEATURE_CREATE_TOKEN_PERMISSIVE_MODE') === 'enabled'

export class AccessTokenService {
  private organizationService : OrganizationService
  private passportService : PassportService
  private accessService: AccessService

  constructor(organizationService, passportService, accessService) {
    this.organizationService = organizationService
    this.passportService = passportService
    this.accessService = accessService
  }

  async createToken(statusToken: string, locationId: string, userId: string, dependantIds: string[], delegateAdminUserId?: string): Promise<Access> {
      const {organizationId} = await this.organizationService.getLocationById(locationId)
      const userGroupId = await this.organizationService
        .getUsersGroups(organizationId, null, [userId])
        .then((results) => results[0]?.groupId)
      const group = await this.organizationService.getGroup(organizationId, userGroupId)
      const includeGuardian = !group.checkInDisabled
      const passport = await this.passportService.findOneByToken(statusToken)

      const fail = (reason: string) => {
        console.warn(reason)
        console.warn(passport)
        throw new ForbiddenException('Entry into this location is not permitted based on your profile. Please contact your administrator for more information.')
      }

      if (!passport) {
        fail('Access denied: status-token does not link to a passport')
        return
      }

      if (passport.userId !== userId) {
        // TODO: we could remove userId from this call
        fail(`Access denied: passport does not belong to ${userId}`)
        return
      }
      if (
        !(
          passport.status === PassportStatuses.Pending ||
          (passport.status === PassportStatuses.Proceed && !isPassed(passport.validUntil))
        )
      ) {
        fail('Access denied: this passport does not permit entry')
        return
      }

      const enteringDependantIds = dependantIds.filter((depId) =>
        passport.dependantIds.includes(depId),
      )
      if (permissiveMode) {
        if (!enteringDependantIds.length && !includeGuardian) {
          fail('Access denied: this passport does not apply to any specified users')
          return
        } else if (enteringDependantIds.length < dependantIds.length) {
          console.warn(
            `Allowing 'partial credit' entry (requested: ${dependantIds.join()} - entering: ${enteringDependantIds.join()})`,
          )
        }
      } else if (enteringDependantIds.length < dependantIds.length) {
        fail('Access denied: this passport does not apply to all dependants')
        return
      }

      const access = await this.accessService.create(
        statusToken,
        locationId,
        userId,
        includeGuardian,
        enteringDependantIds,
        delegateAdminUserId,
      )

      return access
  }
}
