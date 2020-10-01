import moment from 'moment-timezone'

import TraceRepository from '../repository/trace.repository'
import type {ExposureReport, StopStatus} from '../models/trace'
import type {SinglePersonAccess} from '../models/attendance'
import DataStore from '../../../common/src/data/datastore'
import {AdminApprovalModel} from '../../../common/src/data/admin'
import {UserModel} from '../../../common/src/data/user'
import {getExposureSection, getHeaderSection, UserGroupData} from './exposureTemplate'
import type {Answers} from './exposureTemplate'
import {send} from '../../../common/src/service/messaging/send-email'
import {Config} from '../../../common/src/utils/config'

import {OrganizationModel} from '../../../enterprise/src/repository/organization.repository'
import {UserService} from '../../../common/src/service/user/user-service'
import {OrganizationService} from '../../../enterprise/src/services/organization-service'
import {QuestionnaireService} from '../../../lookup/src/services/questionnaire-service'
import {Organization, OrganizationGroup} from '../../../enterprise/src/models/organization'

const timeZone = Config.get('DEFAULT_TIME_ZONE')
const SUPPRESS_USER_EMAILS = Config.get('FEATURE_ONLY_EMAIL_SUPPORT') === 'enabled'

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
  earliestTime: number,
  latestTime: number,
): Overlap | null => {
  const aEnterAt = a.enteredAt ?? {toDate: () => new Date(earliestTime)}
  const bEnterAt = b.enteredAt ?? {toDate: () => new Date(earliestTime)}
  const aExitAt = a.exitAt ?? {toDate: () => new Date(latestTime)}
  const bExitAt = b.exitAt ?? {toDate: () => new Date(latestTime)}
  // @ts-ignore these are timestamps (or fake timestamps), not dates
  const lastGotIn = aEnterAt.toDate() > bEnterAt.toDate() ? aEnterAt : bEnterAt
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

// const topicName = Config.get('PUBSUB_TRACE_TOPIC')
// const subscriptionName = Config.get('PUBSUB_TRACE_SUBSCRIPTION')

// When triggered, this creates a trace
export default class TraceListener {
  repo: TraceRepository
  orgRepo: OrganizationModel
  userApprovalRepo: AdminApprovalModel
  userRepo: UserModel
  questionnaireService: QuestionnaireService
  organizationService: OrganizationService
  userService: UserService
  constructor() {
    const dataStore = new DataStore()
    this.repo = new TraceRepository(dataStore)
    this.orgRepo = new OrganizationModel(dataStore)
    this.userApprovalRepo = new AdminApprovalModel(dataStore)
    this.userRepo = new UserModel(dataStore)
    this.questionnaireService = new QuestionnaireService()
    this.organizationService = new OrganizationService()
    this.userService = new UserService()
  }

  async handleMessage(message: {
    data: string
    attributes: {
      startTime: string
      endTime: string
      passportStatus: string
      userId: string
      organizationId: string
      locationId: string
      questionnaireId: string
      answers: string
    }
  }): Promise<void> {
    const {data, attributes} = message
    const payload = Buffer.from(data, 'base64').toString()
    if (payload !== 'trace-required') {
      return
    }
    const {userId, passportStatus} = attributes
    const startTime = parseInt(attributes.startTime, 10)
    const endTime = parseInt(attributes.endTime, 10)
    await this.traceFor(
      userId,
      startTime,
      endTime,
      passportStatus,
      attributes.organizationId,
      attributes.locationId,
      attributes.questionnaireId,
      JSON.parse(attributes.answers),
    )
  }

  async traceFor(
    userId: string,
    startTime: number,
    endTime: number,
    passportStatus: string,
    organizationId: string,
    locationId: string,
    questionnaireId: string,
    answers: Answers,
  ): Promise<ExposureReport[]> {
    // because of time zones we might be interested in other dates
    const earliestDate = moment(startTime).tz(timeZone).format('YYYY-MM-DD')
    const latestDate = moment(endTime).tz(timeZone).format('YYYY-MM-DD')

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
        const includedOverlapJSONs = new Set<string>()
        const startOfDay = moment(dailyReport.date).tz(timeZone).toDate().valueOf()
        const endOfDay = moment(dailyReport.date).tz(timeZone).add(1, 'day').toDate().valueOf()
        // TODO: this could be made more efficient with some sorting
        const overlapping = otherUsersAccesses
          .map((access) =>
            mainUserAccesses
              .map((contaminated) => overlap(contaminated, access, startOfDay, endOfDay))
              .filter(
                (range) =>
                  range && range.end.valueOf() > startTime && range.start.valueOf() < endTime,
              )
              .map((range) => ({
                userId: access.userId,
                dependant: access.dependant,
                ...range,
              }))
              .filter((overlapRecord) => {
                const json = JSON.stringify(overlapRecord)
                if (includedOverlapJSONs.has(json)) {
                  return false
                }
                includedOverlapJSONs.add(json)
                return true
              }),
          )
          .reduce((flattened, page) => [...flattened, ...page], [])

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
    this.sendEmails(
      result,
      userId,
      locations,
      accessLookup,
      endTime,
      passportStatus,
      organizationId,
      locationId,
      questionnaireId,
      answers,
    )
    return result
  }

  private async sendEmails(
    reports: ExposureReport[],
    userId: string,
    locations: Record<string, LocationDescription>,
    accesses: AccessLookup,
    endTime: number,
    status: string,
    orgId: string,
    locId: string,
    questionnaireId: string,
    answers: Answers,
  ): Promise<void> {
    const allLocationIds: Set<string> = new Set([locId])
    const allOrganizationIds: Set<string> = new Set([orgId])
    const allUserIds: Set<string> = new Set([userId])

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
    const questionnaire = await this.questionnaireService.getQuestionnaire(questionnaireId)
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
    // const locationAdmins = (
    //   await Promise.all(
    //     locationPages.map((page) =>
    //       this.userApprovalRepo.findWhereArrayInMapContainsAny('profile', 'adminForLocationIds', page),
    //     ),
    //   )
    // ).reduce((flattened, page) => [...flattened, ...page], [])
    const organizationAdmins = (
      await Promise.all(
        organizationPages.map((page) =>
          this.userApprovalRepo.findWhereArrayInMapContainsAny(
            'profile',
            'superAdminForOrganizationIds',
            page,
          ),
        ),
      )
    ).reduce((flattened, page) => [...flattened, ...page], [])
    const users = (
      await Promise.all(userPages.map((page) => this.userRepo.findWhereIdIn(page)))
    ).reduce((flattened, page) => [...flattened, ...page], [])

    const organizationData = await Promise.all(
      allOrganizations.map(async (orgId) => {
        return {
          org: await this.organizationService.findOneById(orgId),
          groups: await this.organizationService.getGroups(orgId),
        }
      }),
    )

    const organizationLookup: Record<
      string,
      {org: Organization; groups: OrganizationGroup[]}
    > = organizationData.reduce(
      (lookup, data) => ({
        ...lookup,
        [data.org.id]: data,
      }),
      {},
    )
    // TODO: this is an extremely expensive loop. See issue #429 in github
    const allUsersWithDependantsAndGroups = await Promise.all(
      users.map(async (user) => {
        return {
          id: user.id,
          orgId: user.organizationIds[0],
          groups: await this.organizationService.getUsersGroups(user.organizationIds[0], null, [
            user.id,
          ]),
          dependants: await this.userService.getAllDependants(user.id),
        }
      }),
    )

    const userDependantLookup: Record<string, UserGroupData> = allUsersWithDependantsAndGroups
      .map((lookup) => ({
        id: lookup.id,
        orgId: lookup.orgId,
        groupNames: lookup.groups.map(
          (membership) =>
            organizationLookup[lookup.orgId].groups.find((group) => group.id === membership.groupId)
              ?.name,
        ),
        dependants: lookup.dependants.map((dep) => ({
          id: dep.id,
          groupName: organizationLookup[lookup.orgId].groups.find(
            (group) => group.id === dep.groupId,
          )?.name,
        })),
      }))
      .reduce((lookup, data) => ({...lookup, [data.id]: data}), {})

    const sourceUser = users.find((u) => u.id === userId)

    const reportsForLocation = {}
    const reportsForOrganization = {}
    const allReports = []
    const header = getHeaderSection(
      sourceUser,
      endTime,
      status,
      questionnaire,
      answers,
      userDependantLookup,
    )
    reports.forEach((report) => {
      const section = getExposureSection(
        report,
        users,
        locations[report.locationId].title,
        userDependantLookup,
      )
      if (!section) {
        return
      }
      if (!reportsForLocation[report.locationId]) {
        reportsForLocation[report.locationId] = []
      }
      reportsForLocation[report.locationId].push(section)
      if (!reportsForOrganization[report.organizationId]) {
        reportsForOrganization[report.organizationId] = []
      }
      reportsForOrganization[report.organizationId].push(section)
      allReports.push(section)
    })

    const handledIds: Set<string> = new Set()
    // may contain duplicates...
    // in future when we want to send to location admins as well

    // const allRecipients = [...locationAdmins, ...organizationAdmins]
    const allRecipients = [...organizationAdmins]
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
        orgReports: user.profile.superAdminForOrganizationIds.reduce(
          (flat, id) => [...flat, ...(reportsForOrganization[id] || [])],
          [],
        ),
        locReports: [],
        // TODO: we aren't sending reports to location admins for now, but
        // when we do we need to make sure to deduplicate here before we reenable
        // locReports: user.profile.adminForLocationIds.reduce(
        //   (flat, id) => [...flat, ...(reportsForLocation[id] || [])],
        //   [],
        // ),
      }))
    const orgName = organizationLookup[orgId].org.name
    if (!SUPPRESS_USER_EMAILS) {
      allRecipients.forEach((recipient) =>
        send(
          recipient.email,
          `Contact trace for ${orgName}`,
          recipient.orgReports.length
            ? `${header} ${recipient.orgReports.join('')}`
            : `${header} No one was in contact with the user`,
        ),
      )
    }

    // Send a dedicated email to support with all of the exposures
    if (!allReports.length) {
      // No reports means that no one was exposed
      send([], `Exposure report for ${orgName}`, `${header} No one was in contact with the user`)
    } else {
      send([], `Exposure report for ${orgName}`, `${header} ${allReports.join('')}`)
    }
  }
}
