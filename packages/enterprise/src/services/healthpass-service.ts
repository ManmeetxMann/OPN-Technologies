import DataStore from '../../../common/src/data/datastore'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {ForbiddenException} from '../../../common/src/exceptions/forbidden-exception'
import {UserModel} from '../../../common/src/data/user'
import {safeTimestamp, isPassed} from '../../../common/src/utils/datetime-util'

import {OrganizationModel} from '../repository/organization.repository'
import {UserActionsRepository} from '../repository/action-items.repository'
import {ActionItem} from '../models/action-items'

type HealthPass = {
  expiry: string
  tests: {
    id: string
    date: string
    type: string
    status: string
    style: string
  }[]
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
    if (!items.latestPassport || isPassed(safeTimestamp(items.latestPassport.expiry))) {
      return {
        expiry: null,
        tests,
      }
    }
    const expiry = safeTimestamp(items.latestPassport.expiry).toISOString()
    if (items.latestAttestation) {
      tests.push({
        date: safeTimestamp(items.latestAttestation.timestamp).toISOString(),
        type: 'Attestation',
        id: items.latestAttestation.attestationId,
        status: items.latestAttestation.status,
        style: 'GREEN',
      })
    }
    if (items.latestTemperature) {
      tests.push({
        date: safeTimestamp(items.latestTemperature.timestamp).toISOString(),
        type: 'Temperature',
        id: items.latestTemperature.temperatureId,
        status: items.latestTemperature.status,
        style: 'GREEN',
      })
    }
    if (items.PCRTestResult) {
      tests.push({
        date: safeTimestamp(items.latestTemperature.timestamp).toISOString(),
        type: 'PCR Test',
        id: items.PCRTestResult.testId,
        status: items.PCRTestResult.result,
        style: 'GREEN',
      })
    }
    return {tests, expiry}
  }
}
