import DataStore from '../../../common/src/data/datastore'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {ForbiddenException} from '../../../common/src/exceptions/forbidden-exception'
import {UserModel} from '../../../common/src/data/user'
import {safeTimestamp, isPassed} from '../../../common/src/utils/datetime-util'
import {now, serverTimestamp} from '../../../common/src/utils/times'
import {Config} from '../../../common/src/utils/config'

import {OrganizationModel} from '../repository/organization.repository'
import {UserActionsRepository} from '../repository/action-items.repository'
import {ActionItem, Recommendations} from '../models/action-items'

import {PassportStatuses, PassportStatus} from '../../../passport/src/models/passport'
import {TemperatureStatuses} from '../../../reservation/src/models/temperature'
import {ResultTypes, AppointmentStatus} from '../../../reservation/src/models/appointment'
import moment from 'moment'
import {AddPulse} from '../types/recommendations'

const tz = Config.get('DEFAULT_TIME_ZONE')

export type DecoratedRecommendation = {
  id: string | null
  title: string
  body: string
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
      latestAttestation: null,
      latestTemperature: null,
      scheduledPCRTest: null,
      PCRTestResult: null,
      latestPulse: null,
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
    if (passport?.status === PassportStatuses.Proceed) {
      // PROCEED
      return [Recommendations.PassAvailable, Recommendations.UpdateAssessment]
    }
    // STOP
    return [Recommendations.UpdateAssessment, Recommendations.BadgeExpiry]
  }

  private getRecommendationsTemperature = (items: ActionItem): Recommendations[] => {
    const passport = items.latestPassport
    const passportExpiry = passport ? safeTimestamp(passport.expiry) : null
    if (!passport || isPassed(passportExpiry) || passport.status === PassportStatuses.Pending) {
      // pending
      return [Recommendations.CompleteAssessment, Recommendations.StatusInfo]
    }
    const {status} = passport
    if (status == PassportStatuses.Stop || status == PassportStatuses.Caution) {
      // stop
      if (
        items.latestTemperature?.status === TemperatureStatuses.Stop &&
        items.latestAttestation &&
        safeTimestamp(items.latestTemperature.timestamp) >
          safeTimestamp(items.latestAttestation.timestamp)
      ) {
        // temp was too high
        return [Recommendations.BadgeExpiry, Recommendations.ViewPositiveTemp]
      }
      // bad attestation
      return [Recommendations.BadgeExpiry, Recommendations.CompleteAssessment]
    }
    if (status == PassportStatuses.TemperatureCheckRequired) {
      // tcr
      return [Recommendations.TempCheckRequired, Recommendations.PassAvailable]
    }
    if (status == PassportStatuses.Proceed) {
      const recommendations = [Recommendations.PassAvailable]
      if (items.latestTemperature) {
        recommendations.push(Recommendations.ViewNegativeTemp)
      }
      return recommendations
    }
  }

  private getRecommendationsPCR = (items: ActionItem): Recommendations[] => {
    const passport = items.latestPassport
    const passportExpiry = passport ? safeTimestamp(passport.expiry) : null
    const latestTest = items.PCRTestResult
    const appointment = items.scheduledPCRTest

    if (!passport || isPassed(passportExpiry) || passport.status === PassportStatuses.Pending) {
      // pending
      if (appointment?.status === AppointmentStatus.Pending) {
        const isToday = moment(now())
          .tz(tz)
          .endOf('day')
          .isSameOrAfter(safeTimestamp(appointment.date))
        return [
          Recommendations.CompleteAssessment,
          isToday ? Recommendations.CheckInPCR : Recommendations.BookingDetailsPCR,
        ]
      }
      // checked in, but may still be in the future
      if (appointment?.status === AppointmentStatus.CheckedIn) {
        const alreadyHappened = moment(now()).isSameOrAfter(safeTimestamp(appointment.date))
        if (!alreadyHappened)
          return [Recommendations.CompleteAssessment, Recommendations.CheckInPCR]
      }
      if (
        !latestTest ||
        !appointment ||
        safeTimestamp(latestTest.timestamp) > safeTimestamp(appointment.date)
      ) {
        // need to book a test
        return [Recommendations.BookPCR, Recommendations.CompleteAssessment]
      }
      return [Recommendations.ResultReadiness]
    }
    const {status} = passport
    if (status == PassportStatuses.Stop || status == PassportStatuses.Caution) {
      // stop
      if (
        items.PCRTestResult &&
        [
          ResultTypes.Positive,
          ResultTypes.PreliminaryPositive,
          ResultTypes.PresumptivePositive,
        ].includes(items.PCRTestResult.result)
      ) {
        // positive test
        return [Recommendations.BadgeExpiry, Recommendations.ViewPositivePCR]
      }
      // bad attestation
      return [Recommendations.BadgeExpiry, Recommendations.CompleteAssessment]
    }
    if (status == PassportStatuses.Proceed) {
      // proceed
      if (latestTest) {
        return [Recommendations.PassAvailable, Recommendations.ViewNegativePCR]
      } else {
        // shouldn't happen but
        return [Recommendations.PassAvailable]
      }
    }
  }

  // TODO: add localization
  private decorateRecommendation = (
    recommendation: Recommendations,
    items: ActionItem,
  ): DecoratedRecommendation => {
    let id = null
    let title = `${recommendation} title`
    let body = `${recommendation} body`
    switch (recommendation) {
      case Recommendations.ResultReadiness: {
        title = 'Result Readiness'
        body = 'Where are my results?'
        break
      }
      case Recommendations.BadgeExpiry: {
        title = 'Badge Expiry'
        const expiryTime = safeTimestamp(items.latestPassport.expiry)
        const minutesDiff = -moment(now()).diff(expiryTime, 'minutes')
        const minutes = minutesDiff % 60
        const hours = ((minutesDiff - minutes) % (60 * 24)) / 60
        const days = (minutesDiff - 60 * hours - minutes) / (60 * 24)

        body = `${minutes}M left`
        if (hours) {
          body = `${hours}H ${body}`
        }
        if (days) {
          body = `${days}D ${body}`
        }
        break
      }
      case Recommendations.BookPCR: {
        const isRebooking = [
          ResultTypes.Inconclusive,
          ResultTypes.Indeterminate,
          ResultTypes.Invalid,
        ].includes(items.PCRTestResult?.result)
        title = isRebooking ? 'Book Re-sample' : 'Book a Covid-19 Test'
        body = isRebooking ? 'Take a second test' : 'Pick a day and time'
        break
      }
      case Recommendations.BookingDetailsPCR: {
        title = 'View Booking Details'
        const date = moment(safeTimestamp(items.scheduledPCRTest.date)).tz(tz)
        body = date.format('MMMM Do [@] hh:mm a')
        id = items.scheduledPCRTest.appointmentId
        break
      }
      case Recommendations.CheckInPCR: {
        title = 'View Appointment QR Code'
        body = 'Check in to appointment'
        id = items.scheduledPCRTest.appointmentId
        break
      }
      case Recommendations.CompleteAssessment: {
        title = 'Complete a Self-Assessment'
        body = 'Get a health pass'
        break
      }
      case Recommendations.PassAvailable: {
        title = 'Pass Available'
        body = 'View my pass'
        // TODO: id?
        break
      }
      case Recommendations.StatusInfo: {
        title = 'Status Info'
        body = 'Learn more about my status'
        break
      }
      case Recommendations.TempCheckRequired: {
        title = 'Complete a Pulse/Temp Check'
        body = 'Verify your badge with a check'
        break
      }
      case Recommendations.UpdateAssessment: {
        title = 'Update Assessment'
        body = 'Report a change'
        break
      }
      case Recommendations.ViewNegativePCR: {
        title = 'View Negative Test Result'
        body = 'View result details'
        id = items.PCRTestResult.testId
        break
      }
      case Recommendations.ViewPositivePCR: {
        title = 'View Positive Test Result'
        body = 'View result details'
        id = items.PCRTestResult.testId
        break
      }
      case Recommendations.ViewNegativeTemp: {
        title = 'View Temperature Result'
        body = 'Temperature Details'
        id = items.latestTemperature.temperatureId
        break
      }
      case Recommendations.ViewPositiveTemp: {
        title = 'View Temperature Result'
        body = 'Temperature Details'
        id = items.latestTemperature.temperatureId
        break
      }
    }
    return {
      id,
      recommendation,
      title,
      body,
    }
  }

  async getRecommendations(userId: string, orgId: string): Promise<DecoratedRecommendation[]> {
    const [org, items] = await Promise.all([
      this.organizationRepository.findOneById(orgId),
      this.getItems(userId, orgId),
    ])

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

  async addAttestation(
    userId: string,
    organizationId: string,
    attestationId: string,
    status: PassportStatus,
  ): Promise<void> {
    // make sure the user has items
    await this.getItems(userId, organizationId)
    const repo = new UserActionsRepository(this.dataStore, userId)
    await repo.updateProperty(organizationId, 'latestAttestation', {
      attestationId,
      status,
      timestamp: serverTimestamp(),
    })
  }
  async addPassport(
    userId: string,
    organizationId: string,
    passportId: string,
    status: PassportStatus,
    expiry: string,
  ): Promise<void> {
    // make sure the user has items
    await this.getItems(userId, organizationId)
    const repo = new UserActionsRepository(this.dataStore, userId)
    await repo.updateProperty(organizationId, 'latestPassport', {
      passportId,
      status,
      expiry: safeTimestamp(expiry),
      timestamp: serverTimestamp(),
    })
  }
  async addTemperature(
    userId: string,
    organizationId: string,
    temperatureId: string,
    temperature: string,
    status: TemperatureStatuses,
  ): Promise<void> {
    // make sure the user has items
    await this.getItems(userId, organizationId)
    const repo = new UserActionsRepository(this.dataStore, userId)
    await repo.updateProperty(organizationId, 'latestTemperature', {
      temperatureId,
      temperature,
      status,
      timestamp: serverTimestamp(),
    })
  }
  async addPCRAppointment(
    userId: string,
    organizationId: string,
    appointmentId: string,
    status: AppointmentStatus,
    date: string,
  ): Promise<void> {
    // make sure the user has items
    await this.getItems(userId, organizationId)
    const repo = new UserActionsRepository(this.dataStore, userId)
    await repo.updateProperty(organizationId, 'scheduledPCRTest', {
      appointmentId,
      status,
      date: safeTimestamp(date),
      timestamp: serverTimestamp(),
    })
  }
  async deletePCRAppointment(userId: string, organizationId: string): Promise<void> {
    // make sure the user has items
    await this.getItems(userId, organizationId)
    const repo = new UserActionsRepository(this.dataStore, userId)
    await repo.updateProperty(organizationId, 'scheduledPCRTest', null)
  }
  async addPCRTestResult(
    userId: string,
    organizationId: string,
    testId: string,
    result: ResultTypes,
  ): Promise<void> {
    // make sure the user has items
    await this.getItems(userId, organizationId)
    const repo = new UserActionsRepository(this.dataStore, userId)
    await repo.updateProperty(organizationId, 'PCRTestResult', {
      testId,
      result,
      timestamp: serverTimestamp(),
    })
  }
  async addPulse({
    userId,
    organizationId,
    pulseId,
    pulse,
    oxygen,
    status,
  }: AddPulse): Promise<void> {
    // make sure the user has items
    await this.getItems(userId, organizationId)
    const repo = new UserActionsRepository(this.dataStore, userId)
    await repo.updateProperty(organizationId, 'latestPulse', {
      pulseId,
      pulse,
      oxygen,
      status,
      timestamp: serverTimestamp(),
    })
  }
}
