import DataStore from '../../../common/src/data/datastore'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {ForbiddenException} from '../../../common/src/exceptions/forbidden-exception'
import {UserModel} from '../../../common/src/data/user'
import {safeTimestamp, isPassed} from '../../../common/src/utils/datetime-util'
import {now} from '../../../common/src/utils/times'
import {Config} from '../../../common/src/utils/config'

import {OrganizationModel} from '../repository/organization.repository'
import {UserActionsRepository} from '../repository/action-items.repository'
import {ActionItem, Recommendations} from '../models/action-items'

import {PassportStatuses} from '../../../passport/src/models/passport'
import {TemperatureStatuses} from '../../../reservation/src/models/temperature'
import {ResultTypes} from '../../../reservation/src/models/appointment'
import moment from 'moment'

const tz = Config.get('DEFAULT_TIME_ZONE')

export type DecoratedRecommendation = {
  id: string | null
  timestamp: string | null
  recommendation: Recommendations
}

export class RecommendationService {
  private dataStore = new DataStore()
  private organizationRepository = new OrganizationModel(this.dataStore)
  private userRepository = new UserModel(this.dataStore)

  private getItems = async (userId: string, orgId: string): Promise<ActionItem> => {
    const itemsRepo = new UserActionsRepository(this.dataStore, userId)
    let items = await itemsRepo.findOneById(orgId)
    if (items) {
      return items
    }
    // not available, check if it should be created
    const [org, user] = await Promise.all([
      this.organizationRepository.findOneById(orgId),
      this.userRepository.findOneById(userId),
    ])
    if (!org) {
      throw new ResourceNotFoundException(`No organization ${orgId}`)
    }
    if (!user) {
      throw new ResourceNotFoundException(`No user ${userId}`)
    }
    if (!user.organizationIds?.includes(orgId)) {
      throw new ForbiddenException(`User ${userId} not a member of org ${orgId}`)
    }
    items = await itemsRepo.add({
      id: orgId,
      latestPassport: null,
      latestTemperature: null,
      scheduledPCRTest: null,
      PCRTestResult: null,
    })
    return items
  }

  private getRecommendationsAttestation = (items: ActionItem): Recommendations[] => {
    const passport = items.latestPassport
    const passportExpiry = passport ? safeTimestamp(passport.expiry) : null
    if (!passportExpiry || isPassed(passportExpiry)) {
      // PENDING
      return [Recommendations.StatusInfo, Recommendations.CompleteAssessment]
    }
    if (passport.status === PassportStatuses.Proceed) {
      // PROCEED
      return [Recommendations.PassAvailable, Recommendations.UpdateAssessment]
    }
    // STOP
    return [Recommendations.UpdateAssessment, Recommendations.BadgeExpiry]
  }

  private getRecommendationsTemperature = (items: ActionItem): Recommendations[] => {
    const passport = items.latestPassport
    const passportExpiry = passport ? safeTimestamp(passport.expiry) : null
    if (
      !passportExpiry ||
      isPassed(passportExpiry) ||
      passport.status == PassportStatuses.TemperatureCheckRequired
    ) {
      // PENDING
      if (passport.status == PassportStatuses.TemperatureCheckRequired) {
        return [Recommendations.StatusInfo, Recommendations.TempCheckRequired]
      }
      return [Recommendations.StatusInfo, Recommendations.CompleteAssessment]
    }

    const latestTemp = items.latestTemperature
    if (latestTemp?.status === TemperatureStatuses.Proceed) {
      // PROCEED
      return [Recommendations.BadgeExpiry, Recommendations.ViewNegativeTemp]
    }
    // STOP
    return [Recommendations.BadgeExpiry, Recommendations.ViewPositiveTemp]
  }

  private getRecommendationsPCR = (items: ActionItem): Recommendations[] => {
    const passport = items.latestPassport
    const passportExpiry = passport ? safeTimestamp(passport.expiry) : null
    const latestTest = items.PCRTestResult
    if (!passportExpiry || isPassed(passportExpiry)) {
      // PENDING
      if (latestTest?.result === ResultTypes.Pending) {
        // pending test
        return [Recommendations.ResultReadiness]
      }
      if (items.scheduledPCRTest && !isPassed(safeTimestamp(items.scheduledPCRTest.date))) {
        // upcoming test
        const isToday = moment(now())
          .tz(tz)
          .endOf('day')
          .isSameOrAfter(safeTimestamp(items.scheduledPCRTest.date))
        return [
          Recommendations.CompleteAssessment,
          isToday ? Recommendations.CheckInPCR : Recommendations.BookingDetailsPCR,
        ]
      }
      // need to book a test
      return [Recommendations.BookPCR, Recommendations.CompleteAssessment]
    }

    if (latestTest?.result === ResultTypes.Negative) {
      return [Recommendations.BadgeExpiry, Recommendations.ViewNegativePCR]
    }
    return [Recommendations.BadgeExpiry, Recommendations.ViewPositivePCR]
  }

  private decorateRecommendation = (
    recommendation: Recommendations,
    items: ActionItem,
  ): DecoratedRecommendation => {
    let id = null
    let timestamp = null
    if (
      [Recommendations.ViewNegativeTemp, Recommendations.ViewPositiveTemp].includes(recommendation)
    ) {
      id = items.latestTemperature?.temperatureId
      timestamp = items.latestTemperature?.timestamp
    } else if (
      [Recommendations.ViewNegativePCR, Recommendations.ViewPositivePCR].includes(recommendation)
    ) {
      id = items.PCRTestResult?.testId
      timestamp = items.PCRTestResult?.timestamp
    } else if (
      [Recommendations.CheckInPCR, Recommendations.BookingDetailsPCR].includes(recommendation)
    ) {
      id = items.scheduledPCRTest?.testId
      timestamp = items.scheduledPCRTest?.timestamp
    }
    return {
      id,
      timestamp,
      recommendation,
    }
  }

  async getHealthPass(userId: string, orgId: string): Promise<DecoratedRecommendation[]> {
    const items = await this.getItems(userId, orgId)
    const tests = []
    if (items.latestAttestation) {
      tests.push({
        date: safeTimestamp(items.latestAttestation.timestamp).toISOString(),
        type: 'Attestation',
        id: items.latestAttestation.attestationId,
        status: items.latestAttestation.status,
      })
    }
    if (items.latestTemperature) {
      tests.push({
        date: safeTimestamp(items.latestTemperature.timestamp).toISOString(),
        type: 'Attestation',
        id: items.latestTemperature.attestationId,
        status: items.latestTemperature.status,
      })
    }
    if (items.latestTemperature) {
      
    }

    let actions: Recommendations[] = []
    if (org.enableTemperatureCheck) {
      actions = this.getRecommendationsTemperature(items)
    }
    // TODO: better way to test if org is PCR only?
    else if (items.PCRTestResult || items.scheduledPCRTest) {
      actions = this.getRecommendationsPCR(items)
    }
    // Default: attestation only
    else {
      actions = this.getRecommendationsAttestation(items)
    }
    return actions.map((action) => this.decorateRecommendation(action, items))
  }
}
