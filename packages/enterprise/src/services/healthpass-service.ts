import DataStore from '../../../common/src/data/datastore'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {ForbiddenException} from '../../../common/src/exceptions/forbidden-exception'
import {UserModel} from '../../../common/src/data/user'
import {safeTimestamp, isPassed} from '../../../common/src/utils/datetime-util'
import {now} from '../../../common/src/utils/times'
import {Config} from '../../../common/src/utils/config'

import {AppoinmentService} from '../../../reservation/src/services/appoinment.service'

import {OrganizationModel} from '../repository/organization.repository'
import {UserActionsRepository} from '../repository/action-items.repository'
import {ActionItem} from '../models/action-items'

import {PassportStatuses, PassportType} from '../../../passport/src/models/passport'
import {TemperatureStatuses} from '../../../reservation/src/models/temperature'
import {ResultTypes} from '../../../reservation/src/models/appointment'

import moment from 'moment'
import {Bages, HealthPass} from '../types/health-pass'
import {PulseOxygenStatuses} from '../../../reservation/src/models/pulse-oxygen'

export class HealthpassService {
  private dataStore = new DataStore()
  private organizationRepository = new OrganizationModel(this.dataStore)
  private userRepository = new UserModel(this.dataStore)
  private appointmentService = new AppoinmentService()

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
      latestPulse: null,
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

    const PCRDuration = parseInt(Config.get('PCR_VALIDITY_HOURS'))
    const earliestValidPCR = moment(now()).utc().subtract(PCRDuration, 'hours')
    const notStale = (ts) => earliestValid.isSameOrBefore(safeTimestamp(ts))
    if (
      items.latestAttestation?.status === PassportStatuses.Proceed &&
      notStale(items.latestAttestation.timestamp)
    ) {
      tests.push({
        date: safeTimestamp(items.latestAttestation.timestamp).toISOString(),
        type: PassportType.Attestation,
        id: items.latestAttestation.attestationId,
        status: items.latestAttestation.status,
        style: 'GREEN',
      })
    }
    if (
      items.latestTemperature?.status === TemperatureStatuses.Proceed &&
      notStale(items.latestTemperature.timestamp)
    ) {
      tests.push({
        date: safeTimestamp(items.latestTemperature.timestamp).toISOString(),
        type: PassportType.Temperature,
        id: items.latestTemperature.temperatureId,
        status: items.latestTemperature.status,
        style: 'GREEN',
      })
    }
    if (
      items.PCRTestResult?.result === ResultTypes.Negative &&
      earliestValidPCR.isSameOrBefore(safeTimestamp(items.PCRTestResult.timestamp))
    ) {
      tests.push({
        date: safeTimestamp(items.PCRTestResult.timestamp).toISOString(),
        type: PassportType.PCR,
        id: items.PCRTestResult.testId,
        status: items.PCRTestResult.result,
        style: 'GREEN',
      })
    }
    if (
      items.latestPulse?.status === PulseOxygenStatuses.Passed &&
      notStale(items.latestPulse.timestamp)
    ) {
      tests.push({
        date: safeTimestamp(items.latestPulse.timestamp).toISOString(),
        type: PassportType.PulseOxygenCheck,
        id: items.latestPulse.pulseId,
        status: items.latestPulse.status,
        style: 'GREEN',
      })
    }
    return {tests, expiry, status}
  }

  async getMetadataFromLastPCR(
    pass: HealthPass,
  ): Promise<{
    dateOfBirth: string | null
    travelIDIssuingCountry: string | null
    travelID: string | null
  }> {
    const testsPCR = pass.tests
      .filter((test) => test.type === PassportType.PCR)
      .sort((current, next) => {
        const currentDate = new Date(current.date).valueOf()
        const nextDate = new Date(next.date).valueOf()
        return nextDate - currentDate
      })

    if (testsPCR[0]) {
      const testId = testsPCR[0].id
      const appointment = await this.appointmentService.getAppointmentOnlyDBById(testId)
      if (appointment) {
        const {dateOfBirth, travelID, travelIDIssuingCountry} = appointment
        return {
          dateOfBirth: dateOfBirth || null,
          travelIDIssuingCountry: travelIDIssuingCountry || null,
          travelID: travelID || null,
        }
      }
    }
    return {
      dateOfBirth: null,
      travelIDIssuingCountry: null,
      travelID: null,
    }
  }

  async getBages(userId: string, organizationId: string): Promise<Bages> {
    const items = await this.getItems(userId, organizationId)

    return {
      hasSelfTestBadge: Boolean(
        items?.latestAttestation?.status &&
          items.latestAttestation.status !== PassportStatuses.Pending,
      ),
      hasTempBadge: Boolean(items?.latestTemperature?.status),
      hasPCRBadge: Boolean(items?.PCRTestResult?.result),
      hasPulseBadge: Boolean(items?.latestPulse?.status),
      hasVaccineBadge: false,
    }
  }
}
