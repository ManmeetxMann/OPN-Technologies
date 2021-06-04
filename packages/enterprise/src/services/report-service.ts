import * as _ from 'lodash'
import moment from 'moment'

import {now, toDateTimeFormat, toDateFormat} from '../../../common/src/utils/times'
import {safeTimestamp} from '../../../common/src/utils/datetime-util'
import {UserService} from '../../../common/src/service/user/user-service'
import {User} from '../../../common/src/data/user'
import DataStore from '../../../common/src/data/datastore'
import {Config} from '../../../common/src/utils/config'

import {OrganizationService} from './organization-service'
import {OrganizationGroup, OrganizationLocation, Organization} from '../models/organization'
import {Stats, StatsFilter} from '../models/stats'
import userTemplate from '../templates/user-report'

import {AccessService} from '../../../access/src/service/access.service'
import {CheckInsCount} from '../../../access/src/models/access-stats'
import {ExposureReport} from '../../../access/src/models/trace'
import {Access} from '../../../access/src/models/access'

import {Questionnaire} from '../../../lookup/src/models/questionnaire'

import {PassportStatus, PassportStatuses} from '../../../passport/src/models/passport'
import {AttestationService} from '../../../passport/src/services/attestation-service'
import {PassportService} from '../../../passport/src/services/passport-service'
import {TemperatureService} from '../../../reservation/src/services/temperature.service'

type AugmentedUser = Omit<User, 'status'> & {group: OrganizationGroup; status: PassportStatus}
type Lookups = {
  usersLookup: Record<string, AugmentedUser> // users by id (with group and status)
  locationsLookup: Record<string, OrganizationLocation> // lookups by id
  groupsLookup: Record<string, OrganizationGroup> // groups by id
  membershipLookup: Record<string, OrganizationGroup> // groups by member (user or dependant) id
  statusesLookup: Record<string, PassportStatus> // statuses by person (user or dependant) id
}

type UserInfoBundle = {
  access: Access
  user: User
  status: PassportStatus
}

const timeZone = Config.get('DEFAULT_TIME_ZONE')

const getHourlyCheckInsCounts = (accesses: {enteredAt: string}[]): CheckInsCount[] => {
  const countsPerHour: Record<string, number> = {}
  for (const {enteredAt} of accesses) {
    if (enteredAt) {
      const targetedHour = moment(enteredAt).startOf('hour').toISOString()
      countsPerHour[targetedHour] = (countsPerHour[targetedHour] ?? 0) + 1
    }
  }
  return Object.entries(countsPerHour)
    .sort(([date1], [date2]) => Date.parse(date1) - Date.parse(date2))
    .map(([date, count]) => ({date, count}))
}

const getPassportsCountPerStatus = (
  accesses: {status: PassportStatus}[],
): Record<PassportStatus, number> => {
  const counts = {
    [PassportStatuses.Pending]: 0,
    [PassportStatuses.Proceed]: 0,
    [PassportStatuses.Caution]: 0,
    [PassportStatuses.Stop]: 0,
    [PassportStatuses.TemperatureCheckRequired]: 0,
  }
  accesses.forEach(({status}) => (counts[status] += 1))
  return counts
}

export class ReportService {
  private organizationService = new OrganizationService()
  private attestationService = new AttestationService()
  private userService = new UserService()
  private accessService = new AccessService()
  private passportService = new PassportService()
  private temperatureService = new TemperatureService()
  private dataStore = new DataStore()

  async getStatsHelper(organizationId: string, filter?: StatsFilter): Promise<Stats> {
    const {groupId, locationId, from, to} = filter ?? {}
    const live = !from && !to

    const duration = moment.duration({hours: 24})
    // fetch documents from last 24 hour
    const dateRange = {
      from: live ? moment(now()).tz(timeZone).subtract(duration).toDate() : new Date(from),
      to: live ? now() : new Date(to),
    }
    // Fetch user groups
    const usersGroups = await this.organizationService.getUsersGroups(organizationId, groupId)
    // Get users & dependants
    const allUserIds = new Set<string>()
    usersGroups.forEach(({userId}) => {
      allUserIds.add(userId)
    })
    // Get accesses
    const data = (
      await this.getAccessesFor(
        [...allUserIds],
        organizationId,
        locationId,
        dateRange.from,
        dateRange.to,
        live,
      )
    ).filter(({access}) => {
      if (locationId) {
        return access
      }
      return true
    })
    const nowMoment = moment(now())
    const nullOrISOString = (status: PassportStatus, timestamp: string | null): string | null => {
      if (!timestamp) return null
      if (status !== PassportStatuses.Proceed) return null
      if (nowMoment.isSameOrBefore(safeTimestamp(timestamp))) return null
      return safeTimestamp(timestamp).toISOString()
    }

    const accesses = data.map(({user, status, access}) => ({
      // remove not-yet-exited exitAt
      exitAt: nullOrISOString(status, access?.exitAt),
      enteredAt: nullOrISOString(status, access?.enteredAt),
      parentUserId: user.delegates?.length ? user.delegates[0] : null,
      status,
      user,
      locationId: access?.locationId,
    }))

    const dailyExposuresCount = await this.getDailyExposures([...allUserIds])

    return {
      accesses,
      asOfDateTime: live ? now().toISOString() : null,
      passportsCountByStatus: getPassportsCountPerStatus(accesses),
      hourlyCheckInsCounts: getHourlyCheckInsCounts(accesses),
      dailyExposuresCount,
    }
  }

  async getUserReportTemplate(
    organization: Organization,
    primaryId: string, // user
    _secondaryId: string, // parent
    from: string,
    to: string,
    // lookup table with users, dependants and groups
    // likely to be needed. Some users or dependants may be missing
    partialLookup: Lookups,
    questionnaires: Questionnaire[],
  ): Promise<ReturnType<typeof userTemplate>> {
    const userId = primaryId

    const [
      attestations,
      exposureTraces,
      userTraces,
      {enteringAccesses, exitingAccesses},
      passport,
      temperatureChecks,
    ] = await Promise.all([
      this.attestationService.getAttestationsInPeriod(primaryId, from, to),
      this.attestationService.getExposuresInPeriod(primaryId, from, to),
      this.attestationService.getTracesInPeriod(primaryId, from, to),
      this.getAccessHistory(from, to, primaryId),
      this.passportService.findLatestDirectPassport(userId, organization.id),
      this.temperatureService.getTemperaturesInRange(userId, organization.id, from, to),
    ])
    // sort by descending attestation time
    // (default ascending)
    attestations.reverse()
    const userIds = new Set<string>([primaryId])

    // overlaps where the other user might have been sick
    const exposureOverlaps: ExposureReport['overlapping'] = []
    exposureTraces.forEach((trace) =>
      trace.exposures.forEach((exposure) =>
        exposure.overlapping.forEach((overlap) => {
          if (overlap.userId === primaryId) {
            exposureOverlaps.push(overlap)
            userIds.add(overlap.sourceUserId)
          }
        }),
      ),
    )
    // overlaps where this user might have been sick
    const traceOverlaps: ExposureReport['overlapping'] = []
    userTraces.forEach((trace) =>
      trace.exposures.forEach((exposure) =>
        exposure.overlapping.forEach((overlap) => {
          if (overlap.sourceUserId === primaryId) {
            traceOverlaps.push(overlap)
            userIds.add(overlap.userId)
          }
        }),
      ),
    )

    // create a lookup that includes any users not listed in the pre-existing lookup
    const missingUsers = _.uniq([...userIds].filter((id) => !partialLookup.usersLookup[id]))
    const extraLookup = missingUsers.length
      ? await this.getLookups(
          new Set(missingUsers),
          organization.id,
          partialLookup.groupsLookup,
          partialLookup.locationsLookup,
        )
      : null
    const allUsersLookups = missingUsers.length
      ? {
          ...partialLookup,
          usersLookup: {
            ...partialLookup.usersLookup,
            ...extraLookup.usersLookup,
          },
        }
      : partialLookup

    // create a lookup with all the delegates of all users in the lookup
    const missingDelegates = new Set<string>()
    Object.keys(allUsersLookups.usersLookup).forEach((uID: string) => {
      const user = allUsersLookups.usersLookup[uID]
      if (!user.delegates?.length) {
        return
      }
      const delegateId = user.delegates[0]
      if (allUsersLookups.usersLookup[delegateId]) {
        return
      }
      missingDelegates.add(delegateId)
    })
    const delegatesLookup = missingDelegates.size
      ? null
      : await this.getLookups(
          missingDelegates,
          organization.id,
          allUsersLookups.groupsLookup,
          allUsersLookups.locationsLookup,
        )
    const lookups = delegatesLookup
      ? {
          ...allUsersLookups,
          usersLookup: {
            ...allUsersLookups.usersLookup,
            ...delegatesLookup.usersLookup,
          },
        }
      : allUsersLookups
    const {locationsLookup, usersLookup} = lookups

    const questionnairesLookup: Record<number, Questionnaire> = {}
    questionnaires.forEach((questionnaire) => {
      const count = Object.keys(questionnaire.questions).length
      if (questionnairesLookup[count]) {
        console.warn(`Multiple questionnaires with ${count} questions`)
        return
      }
      questionnairesLookup[count] = questionnaire
    }, {})

    const printableAccessHistory: {name: string; time: string; action: string}[] = []
    let enterIndex = 0
    let exitIndex = 0
    while (enterIndex < enteringAccesses.length || exitIndex < exitingAccesses.length) {
      let addExit = false
      if (enterIndex >= enteringAccesses.length) {
        addExit = true
      } else if (exitIndex >= exitingAccesses.length) {
        addExit = false
      } else {
        const entering = enteringAccesses[enterIndex]
        const exiting = exitingAccesses[exitIndex]
        const enterTime = safeTimestamp(entering.enteredAt)
        const exitTime = safeTimestamp(exiting.exitAt)
        if (enterTime > exitTime) {
          addExit = true
        }
      }
      if (addExit) {
        const access = exitingAccesses[exitIndex]
        const location = locationsLookup[access.locationId]
        const time = toDateTimeFormat(access.exitAt)
        printableAccessHistory.push({
          name: location.title,
          time,
          action: 'Exit',
        })
        exitIndex += 1
      } else {
        const access = enteringAccesses[enterIndex]
        const location = locationsLookup[access.locationId]
        const time = toDateTimeFormat(access.enteredAt)
        printableAccessHistory.push({
          name: location.title,
          time,
          action: 'Enter',
        })
        enterIndex += 1
      }
    }
    printableAccessHistory.reverse()
    exposureOverlaps.sort((a, b) => (a.start > b.start ? -1 : 1))
    traceOverlaps.sort((a, b) => (a.start > b.start ? -1 : 1))
    // victims
    const printableTraces = traceOverlaps.map((overlap) => {
      const user = usersLookup[overlap.userId]
      return {
        firstName: user.firstName,
        lastName: user.lastName,
        groupName: user.group?.name ?? '',
        start: toDateTimeFormat(overlap.start),
        end: toDateTimeFormat(overlap.end),
      }
    })
    // perpetrators
    const printableExposures = exposureOverlaps.map((overlap) => {
      const user = usersLookup[overlap.sourceUserId]
      return {
        firstName: user.firstName,
        lastName: user.lastName,
        groupName: user.group?.name ?? '',
        start: toDateTimeFormat(overlap.start),
        end: toDateTimeFormat(overlap.end),
      }
    })

    const printableAttestations = attestations.map((attestation) => {
      const answerCount = attestation.answers.length
      const questionnaire = questionnairesLookup[answerCount]
      if (!questionnaire) {
        console.warn(`no questionnaire found for attestation ${attestation.id}`)
      }
      return {
        responses: attestation.answers.map((answer, key) => {
          const yes = answer['0']
          const dateOfTest = yes && answer['1'] && toDateFormat(answer['1'])
          const question =
            questionnaire?.questions[
              // questions start at 1, answers start at 0
              Object.keys(questionnaire.questions).find((qKey) => parseInt(qKey) === key + 1)
            ]?.value ?? `Question ${key}`
          return {
            question: question as string,
            response: yes ? dateOfTest || 'Yes' : 'No',
          }
        }),
        time: toDateFormat(attestation.attestationTime),
        status: attestation.status,
      }
    })
    const deletedUser = {
      firstName: 'Deleted',
      lastName: 'User',
      group: {
        name: 'Unknown Group',
      },
    }
    const named = usersLookup[userId] ?? deletedUser
    const {group} = named
    // TODO: need to look up delegates
    const guardianId = usersLookup[userId].delegates ? usersLookup[userId].delegates[0] : null
    const namedGuardian = guardianId ? usersLookup[guardianId] : null
    return userTemplate({
      attestations: printableAttestations,
      locations: printableAccessHistory,
      passportStatus: passport && passport.status ? passport.status : PassportStatuses.Pending,
      temperatureChecks,
      exposures: _.uniqBy(
        printableExposures,
        (exposure) =>
          `${exposure.firstName}, ${exposure.lastName}, ${exposure.groupName}, ${exposure.start}, ${exposure.end}`,
      ),
      traces: _.uniqBy(
        printableTraces,
        (trace) =>
          `${trace.firstName}, ${trace.lastName}, ${trace.groupName}, ${trace.start}, ${trace.end}`,
      ),
      organizationName: organization.name,
      userGroup: group.name,
      userName: `${named.firstName} ${named.lastName}`,
      guardianName: namedGuardian ? `${namedGuardian.firstName} ${namedGuardian.lastName}` : null,
      generationDate: toDateFormat(now()),
      reportDate: `${toDateFormat(from)} - ${toDateFormat(to)}`,
    })
  }

  private getUsersById(userIds: string[]): Promise<Record<string, User>> {
    const chunks = _.chunk(userIds, 10) as string[][]
    return Promise.all(chunks.map((userIds) => this.userService.findAllBy({userIds}))).then(
      (pages) => {
        const byId: Record<string, User> = {}
        pages.forEach((page) => page.forEach((user) => (byId[user.id] = user)))
        return byId
      },
    )
  }

  getLookups = async (
    userIds: Set<string>,
    organizationId: string,
    cachedGroupsById?: Record<string, OrganizationGroup>,
    cachedLocationsById?: Record<string, OrganizationLocation>,
  ): Promise<Lookups> => {
    const [allUsers, userGroups, allGroups, allLocations, statuses] = await Promise.all([
      // N/10 queries
      this.getUsersById([...userIds]).then((byId) => Object.values(byId)),
      // N/10 queries
      this.organizationService.getUsersGroups(organizationId, null, [...userIds]),
      cachedGroupsById ? null : this.organizationService.getGroups(organizationId),
      cachedLocationsById ? null : this.organizationService.getAllLocations(organizationId),
      // N queries - can be improved? Find latest in ts, batch queries by 10
      Promise.all(
        [...userIds].map(
          (id): Promise<{id: string; status: PassportStatus}> =>
            this.attestationService
              .latestStatus(id, organizationId)
              .then((status) => ({id, status})),
        ),
      ),
    ])
    // keyed by user or dependant ID
    const statusesByUserId: Record<string, PassportStatus> = {}
    statuses.forEach(({id, status}) => (statusesByUserId[id] = status))

    const groupsById: Record<string, OrganizationGroup> =
      cachedGroupsById ??
      allGroups.reduce((lookup, group) => {
        lookup[group.id] = group
        return lookup
      }, {})
    // every location this organization contains
    const locationsById: Record<string, OrganizationLocation> =
      cachedLocationsById ??
      allLocations.reduce((lookup, location) => {
        lookup[location.id] = location
        return lookup
      }, {})
    const groupsByUserId: Record<string, OrganizationGroup> = userGroups.reduce(
      (lookup, groupLink) => {
        lookup[groupLink.userId] = groupsById[groupLink.groupId]
        return lookup
      },
      {},
    )
    const usersById: Record<string, AugmentedUser> = allUsers.reduce(
      (lookup, user: User) => ({
        ...lookup,
        [user.id]: {
          ...user,
          group: groupsByUserId[user.id],
          status: statusesByUserId[user.id],
        } as AugmentedUser,
      }),
      {},
    )
    return {
      usersLookup: usersById,
      locationsLookup: locationsById,
      groupsLookup: groupsById,
      membershipLookup: groupsByUserId,
      statusesLookup: statusesByUserId,
    }
  }

  async getAccessHistory(
    from: string | null,
    to: string | null,
    userId: string,
  ): Promise<{enteringAccesses: Access[]; exitingAccesses: Access[]}> {
    const live = !from && !to
    const betweenCreatedDate = {
      from: live ? moment(now()).subtract(24, 'hours').toDate() : new Date(from),
      to: live ? now() : new Date(to),
    }
    const accesses = await this.accessService.findAllWith({
      userIds: [userId],
      betweenCreatedDate,
    })
    const enteringAccesses = accesses.filter((access) => {
      if (!access.enteredAt) {
        // legacy
        return false
      }
      return true
    })
    const exitingAccesses = accesses.filter((access) => {
      if (!access.exitAt) {
        // legacy
        return false
      }
      if (safeTimestamp(access.exitAt) > betweenCreatedDate.to) {
        return false
      }
      return true
    })
    enteringAccesses.sort((a, b) => {
      const aEnter = safeTimestamp(a.enteredAt)
      const bEnter = safeTimestamp(b.enteredAt)
      if (aEnter < bEnter) {
        return -1
      } else if (bEnter < aEnter) {
        return 1
      }
      return 0
    })
    exitingAccesses.sort((a, b) => {
      const aExit = safeTimestamp(a.exitAt)
      const bExit = safeTimestamp(b.exitAt)
      if (aExit < bExit) {
        return -1
      } else if (bExit < aExit) {
        return 1
      }
      return 0
    })
    return {
      enteringAccesses,
      exitingAccesses,
    }
  }

  private async getAccessesFor(
    userIds: string[],
    organizationId: string,
    locationId: string | undefined,
    after: Date,
    before: Date,
    isLive?: boolean,
  ): Promise<UserInfoBundle[]> {
    const usersById = await this.getUsersById(userIds)
    const nowMoment = moment(now())
    const results = await Promise.all(
      userIds.map(async (id) => {
        const user = usersById[id]
        if (!user) {
          console.warn(
            `user with id ${id} does not exist - they may be have a zombie membership in org ${organizationId}`,
          )
          return null
        }

        const getAccess = () => {
          if (isLive) {
            return locationId
              ? this.accessService.findLatestAtLocation(id, locationId)
              : this.accessService.findLatestAnywhere(id)
          } else {
            return locationId
              ? this.accessService.findAtLocationOnDay(id, locationId, after, before)
              : this.accessService.findAnywhereOnDay(id, after, before)
          }
        }

        const [access, latestPassport] = await Promise.all([
          getAccess(),
          this.passportService.findLatestDirectPassport(id, organizationId),
        ])

        let status

        if (!latestPassport || nowMoment.isAfter(safeTimestamp(latestPassport.validUntil))) {
          status = PassportStatuses.Pending
        } else {
          status = latestPassport.status
        }

        return {access, status, user: usersById[id]}
      }),
    )
    return results.filter((notNull) => notNull)
  }

  async getDailyExposures(userIds: string[]): Promise<number> {
    const today = moment(now()).format('YYYY-MM-DD')

    let exposures = 0
    const exposureCount = userIds.map(async (id) => {
      const userExposures = await this.attestationService.getExposuresInPeriod(id, today, today)

      return (exposures += userExposures.length)
    })

    await Promise.all(exposureCount)

    return exposures
  }
}
