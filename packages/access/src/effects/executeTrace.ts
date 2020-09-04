import moment from 'moment'
import {PubSub} from '@google-cloud/pubsub'

import TraceRepository from '../repository/trace.repository'
import type {ExposureReport, StopStatus} from '../models/trace'
// import type {Access} from '../models/access'
import type {SinglePersonAccess} from '../models/attendance'

import DataStore from '../../../common/src/data/datastore'
import {Config} from '../../../common/src/utils/config'
import {AdminApprovalModel} from '../../../common/src/data/admin'

import {OrganizationModel} from '../../../enterprise/src/repository/organization.repository'
import {UserModel} from '../../../common/src/data/user'

import {getExposureSection} from './exposureTemplate'

import {send} from '../../../common/src/service/messaging/send-email'

type Overlap = {
  start: Date
  end: Date
}
type LocationDescription = {
  title: string
  organizationId: string
}
type AccessLookup = Record<string, Record<string, SinglePersonAccess[]>>

const overlap = (
  a: SinglePersonAccess,
  b: SinglePersonAccess,
  latestTime: number,
): Overlap | null => {
  const lastGotIn = a.enteredAt > b.enteredAt ? a.enteredAt : b.enteredAt
  const aExitAt = a.exitAt ?? {toDate: () => new Date(latestTime)}
  const bExitAt = b.exitAt ?? {toDate: () => new Date(latestTime)}
  // @ts-ignore these are timestamps (or fake timestamps), not dates
  const firstGotOut = aExitAt.toDate() < bExitAt.toDate() ? aExitAt : bExitAt
  if (lastGotIn > firstGotOut) {
    return null
  }
  return {
    // @ts-ignore these are timestamps, not dates
    start: lastGotIn.toDate(),
    // @ts-ignore these are timestamps, not dates
    end: firstGotOut.toDate(),
  }
}

const topicName = Config.get('PUBSUB_TRACE_TOPIC')
const subscriptionName = Config.get('PUBSUB_TRACE_SUBSCRIPTION')

// When triggered, this creates a trace
export default class TraceListener {
  repo: TraceRepository
  orgRepo: OrganizationModel
  userApprovalRepo: AdminApprovalModel
  userRepo: UserModel
  constructor(dataStore: DataStore) {
    this.repo = new TraceRepository(dataStore)
    this.orgRepo = new OrganizationModel(dataStore)
    this.userApprovalRepo = new AdminApprovalModel(dataStore)
    this.userRepo = new UserModel(dataStore)
  }

  async subscribe(): Promise<void> {
    const listener = new PubSub()
    try {
      await listener.createTopic(topicName)
    } catch (error) {
      // already created is an acceptable error here
      if (error.code !== 6) {
        throw error
      }
    }
    try {
      await listener.createSubscription(topicName, subscriptionName)
    } catch (error) {
      // already created is an acceptable error here
      if (error.code !== 6) {
        throw error
      }
    }

    const traceSub = listener.subscription(subscriptionName)
    traceSub.on('message', (message) => {
      const {data, attributes} = message
      const payload = Buffer.from(data, 'base64').toString()
      message.ack()
      if (payload !== 'trace-required') {
        return
      }
      const {userId, passportStatus} = attributes
      const startTime = parseInt(attributes.startTime, 10)
      const endTime = parseInt(attributes.endTime, 10)
      this.traceFor(userId, startTime, endTime, passportStatus)
    })
  }

  async traceFor(
    userId: string,
    startTime: number,
    endTime: number,
    passportStatus: string,
  ): Promise<ExposureReport[]> {
    // because of time zones we might be interested in other dates
    const earliestDate = moment(startTime).add(-1, 'day').format('YYYY-MM-DD')
    const latestDate = moment(endTime).add(1, 'day').format('YYYY-MM-DD')

    const accesses = await this.repo.getAccesses(userId, earliestDate, latestDate)
    const accessLookup = accesses.reduce((accessesByLocation, access): AccessLookup => {
      if (!accessesByLocation[access.locationId]) {
        accessesByLocation[access.locationId] = {}
      }
      accessesByLocation[access.locationId][access.date] = access.accesses
      return accessesByLocation
    }, {})
    // promises resolving with the org ID for the given location
    const locationPromises: Record<string, ReturnType<OrganizationModel['getLocation']>> = {}

    const result = await Promise.all(
      accesses.map(async (dailyReport) => {
        const mainUserAccesses: SinglePersonAccess[] = []
        const otherUsersAccesses: SinglePersonAccess[] = []

        dailyReport.accesses.forEach((access) => {
          if (access.userId === userId) {
            mainUserAccesses.push(access)
          } else {
            otherUsersAccesses.push(access)
          }
        })

        const endOfDay = moment(dailyReport.date).add(1, 'day').toDate().valueOf()
        // TODO: this could be made more efficient with some sorting
        const overlapping = otherUsersAccesses
          .map((access) =>
            mainUserAccesses
              .map((contaminated) => overlap(contaminated, access, endOfDay))
              .filter(
                (range) =>
                  range && range.end.valueOf() > startTime && range.start.valueOf() < endTime,
              )
              .map((range) => ({
                userId: access.userId,
                dependant: access.dependant,
                ...range,
              })),
          )
          .flat()

        if (!locationPromises[dailyReport.locationId]) {
          // just push the promise so we only query once per location
          locationPromises[dailyReport.locationId] = this.orgRepo.getLocation(
            dailyReport.locationId,
          )
        }
        const result = {
          date: dailyReport.date,
          locationId: dailyReport.locationId,
          overlapping,
          organizationId: (await locationPromises[dailyReport.locationId]).organizationId,
        }

        return result
      }),
    )
    this.repo.saveTrace(
      result,
      userId,
      passportStatus as StopStatus,
      moment(endTime).format('YYYY-MM-DD'),
      endTime - startTime,
    )
    const locations = {}
    await Promise.all(
      Object.keys(locationPromises).map(
        async (key) => (locations[key] = await locationPromises[key]),
      ),
    )
    this.sendEmails(result, userId, locations, accessLookup)
    return result
  }

  private async sendEmails(
    reports: ExposureReport[],
    userId: string,
    locations: Record<string, LocationDescription>,
    accesses: AccessLookup,
  ): Promise<void> {
    const allLocationIds: Set<string> = new Set()
    const allOrganizationIds: Set<string> = new Set()
    const allUserIds: Set<string> = new Set()
    allUserIds.add(userId)

    reports.forEach((report: ExposureReport) => {
      const {locationId, organizationId} = report
      allLocationIds.add(locationId)
      allOrganizationIds.add(organizationId)
    })
    Object.keys(accesses).forEach((locationId) =>
      Object.keys(accesses[locationId]).forEach((date) =>
        accesses[locationId][date].forEach((access) => allUserIds.add(access.userId)),
      ),
    )

    const allLocations = [...allLocationIds]
    const allOrganizations = [...allOrganizationIds]
    const allUsers = [...allUserIds]
    // paginate the location and org lists
    const locationPages = []
    const organizationPages = []
    const userPages = []
    for (let i = 0; i < allLocations.length; i += 10) {
      locationPages.push(allLocations.slice(i, i + 10))
    }
    for (let i = 0; i < allOrganizations.length; i += 10) {
      organizationPages.push(allOrganizations.slice(i, i + 10))
    }
    for (let i = 0; i < allUsers.length; i += 10) {
      userPages.push(allUsers.slice(i, i + 10))
    }
    // TODO: these three can go in parallel
    // TODO: get location names as well
    const locationAdmins = (
      await Promise.all(
        locationPages.map((page) =>
          this.userApprovalRepo.findWhereMapKeyContainsAny('profile', 'adminForLocationIds', page),
        ),
      )
    ).flat()
    const organizationAdmins = (
      await Promise.all(
        organizationPages.map((page) =>
          this.userApprovalRepo.findWhereMapKeyContainsAny(
            'profile',
            'superAdminForOrganizationIds',
            page,
          ),
        ),
      )
    ).flat()
    const users = (
      await Promise.all(userPages.map((page) => this.userRepo.findWhereIdIn(page)))
    ).flat()

    const sourceUser = users.find((u) => u.id === userId)

    const reportsForLocation = {}
    const reportsForOrganization = {}

    reports.forEach((report) => {
      if (!reportsForLocation[report.locationId]) {
        reportsForLocation[report.locationId] = []
      }
      reportsForLocation[report.locationId].push(
        getExposureSection(
          report,
          accesses[report.locationId][report.date],
          users,
          locations[report.locationId].title,
          sourceUser,
        ),
      )
      if (!reportsForOrganization[report.organizationId]) {
        reportsForOrganization[report.organizationId] = []
      }
      reportsForOrganization[report.organizationId].push(
        getExposureSection(
          report,
          accesses[report.locationId][report.date],
          users,
          locations[report.locationId].title,
          sourceUser,
        ),
      )
    })

    const handledIds: Set<string> = new Set()
    // may contain duplicates...
    const allRecipients = [...locationAdmins, ...organizationAdmins]
      .filter((u) => {
        if (handledIds.has(u.id)) {
          return false
        }
        handledIds.add(u.id)
        return true
      })
      .filter((u) => !u.expired)
      .map((user) => ({
        email: user.profile.email,
        orgReports: user.profile.superAdminForOrganizationIds.flatMap(
          (id) => reportsForOrganization[id],
        ),
        locReports: user.profile.adminForLocationIds.flatMap((id) => reportsForLocation[id]),
      }))
    allRecipients.forEach((recipient) =>
      send(
        recipient.email,
        'Contact trace',
        `${recipient.locReports.join('')}\n${recipient.orgReports.join('')}`,
      ),
    )
  }
}
