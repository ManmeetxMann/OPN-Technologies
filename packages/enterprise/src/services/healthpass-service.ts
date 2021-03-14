import DataStore from '../../../common/src/data/datastore'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {ForbiddenException} from '../../../common/src/exceptions/forbidden-exception'
import {UserModel} from '../../../common/src/data/user'
import {safeTimestamp, isPassed} from '../../../common/src/utils/datetime-util'

import {OrganizationModel} from '../repository/organization.repository'
import {UserActionsRepository} from '../repository/action-items.repository'
import {ActionItem} from '../models/action-items'

import {PassportStatuses} from '../../../passport/src/models/passport'
import {TemperatureStatuses} from '../../../reservation/src/models/temperature'
import {ResultTypes} from '../../../reservation/src/models/appointment'
import {now} from 'packages/common/src/utils/times'
import {Config} from 'packages/common/src/utils/config'
import moment from 'moment'

type HealthPass = {
  expiry: string
  tests: {
    id: string
    date: string
    type: string
    status: string
    style: string
  }[]
  status: PassportStatuses
}

export class HealthpassService {
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
      latestAttestation: null,
      latestTemperature: null,
      scheduledPCRTest: null,
      PCRTestResult: null,
    })
    return items
  }

  async getHealthPass(userId: string, orgId: string): Promise<HealthPass> {
    const items = await this.getItems(userId, orgId)
    const tests = []
    const status = items.latestPassport?.status as PassportStatuses
    const validStatus = [
      PassportStatuses.Proceed,
      PassportStatuses.TemperatureCheckRequired,
    ].includes(status)
    if (!validStatus || isPassed(safeTimestamp(items.latestPassport.expiry))) {
      return {
        expiry: null,
        tests,
        status: null,
      }
    }
    const expiry = safeTimestamp(items.latestPassport.expiry).toISOString()
    const validDuration = parseInt(Config.get('PASSPORT_EXPIRY_DURATION_MAX_IN_HOURS'))
    const validDurationAgo = moment(now()).utc().subtract(validDuration, 'hours')
    const rolloverHour = parseInt(Config.get('PASSPORT_EXPIRY_TIME_DAILY_IN_HOURS'))
    const lastRollover = moment(now())
      .utc()
      .set({hour: rolloverHour, minute: 0, second: 0, millisecond: 0})
    if (lastRollover.isAfter(now())) {
      lastRollover.subtract(1, 'day')
    }
    const earliestValid = lastRollover.isSameOrAfter(validDurationAgo)
      ? lastRollover
      : validDurationAgo
    if (
      items.latestAttestation?.status === PassportStatuses.Proceed &&
      earliestValid.isSameOrBefore(items.latestAttestation.timestamp)
    ) {
      tests.push({
        date: safeTimestamp(items.latestAttestation.timestamp).toISOString(),
        type: 'Attestation',
        id: items.latestAttestation.attestationId,
        status: items.latestAttestation.status,
        style: 'GREEN',
      })
    }
    if (
      items.latestTemperature?.status === TemperatureStatuses.Proceed &&
      earliestValid.isSameOrBefore(items.latestTemperature.timestamp)
    ) {
      tests.push({
        date: safeTimestamp(items.latestTemperature.timestamp).toISOString(),
        type: 'Temperature',
        id: items.latestTemperature.temperatureId,
        status: items.latestTemperature.status,
        style: 'GREEN',
      })
    }
    if (
      items.PCRTestResult?.result === ResultTypes.Negative &&
      earliestValid.isSameOrBefore(items.PCRTestResult.timestamp)
    ) {
      tests.push({
        date: safeTimestamp(items.PCRTestResult.timestamp).toISOString(),
        type: 'PCR',
        id: items.PCRTestResult.testId,
        status: items.PCRTestResult.result,
        style: 'GREEN',
      })
    }
    return {tests, expiry, status}
  }
}
