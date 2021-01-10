import {now, toDateTimeFormat, toDateFormat} from '../../../common/src/utils/times'
import {safeTimestamp} from '../../../common/src/utils/datetime-util'
import {UserService} from '../../../common/src/service/user/user-service'
import {User} from '../../../common/src/data/user'
import {Range} from '../../../common/src/types/range'

import {OrganizationService} from './organization-service'
import {
  OrganizationGroup,
  OrganizationLocation,
  OrganizationUsersGroup,
  Organization,
} from '../models/organization'
import {Stats, StatsFilter} from '../models/stats'
import userTemplate from '../templates/user-report'

import {AccessService} from '../../../access/src/service/access.service'
import {CheckInsCount} from '../../../access/src/models/access-stats'
import {ExposureReport} from '../../../access/src/models/trace'
import {Access, AccessWithPassportStatusAndUser} from '../../../access/src/models/access'

import {Questionnaire} from '../../../lookup/src/models/questionnaire'
import {QuestionnaireService} from '../../../lookup/src/services/questionnaire-service'

import {Passport, PassportStatus, PassportStatuses} from '../../../passport/src/models/passport'
import {PassportService} from '../../../passport/src/services/passport-service'
import {AttestationService} from '../../../passport/src/services/attestation-service'

import * as _ from 'lodash'
import moment from 'moment'

type AugmentedUser = User & {group: OrganizationGroup; status: PassportStatus}
type Lookups = {
  usersLookup: Record<string, AugmentedUser> // users by id (with group and status)
  locationsLookup: Record<string, OrganizationLocation> // lookups by id
  groupsLookup: Record<string, OrganizationGroup> // groups by id
  membershipLookup: Record<string, OrganizationGroup> // groups by member (user or dependant) id
  statusesLookup: Record<string, PassportStatus> // statuses by person (user or dependant) id
}

const getHourlyCheckInsCounts = (accesses: AccessWithPassportStatusAndUser[]): CheckInsCount[] => {
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
  accesses: AccessWithPassportStatusAndUser[],
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

// select the 'fresher' access
const getPriorityAccess = (
  accessOne: AccessWithPassportStatusAndUser | null,
  accessTwo: AccessWithPassportStatusAndUser | null,
): AccessWithPassportStatusAndUser | null => {
  if (!accessOne) {
    return accessTwo
  }
  if (!accessTwo) {
    return accessOne
  }

  // Check if we status mismatch AND send back non-pending if can
  if (accessOne.status === 'pending' && accessTwo.status !== 'pending') return accessTwo
  else if (accessTwo.status === 'pending' && accessOne.status !== 'pending') return accessOne

  // Else, continue ...

  const accessOneTime = accessOne.exitAt ?? accessOne.enteredAt
  const accessTwoTime = accessTwo.exitAt ?? accessTwo.enteredAt
  if (!accessTwoTime) {
    return accessOne
  }
  if (!accessOneTime) {
    return accessTwo
  }
  if (new Date(accessOneTime) < new Date(accessTwoTime)) {
    return accessTwo
  }
  return accessOne
}

export class ReportService {
  private organizationService = new OrganizationService()
  private attestationService = new AttestationService()
  private questionnaireService = new QuestionnaireService()
  private userService = new UserService()
  private accessService = new AccessService()
  private passportService = new PassportService()

  async getStatsHelper(organizationId: string, filter?: StatsFilter): Promise<Stats> {
    const {groupId, locationId, from, to} = filter ?? {}
    const live = !from && !to

    const betweenCreatedDate = {
      from: live ? moment(now()).startOf('day').toDate() : new Date(from),
      to: live ? now() : new Date(to),
    }
    // Fetch user groups
    const usersGroups = await this.organizationService.getUsersGroups(organizationId, groupId)
    // Get users & dependants
    const nonGuardiansUserIds = new Set<string>()
    const parentUserIds: Record<string, string> = {}
    usersGroups.forEach(({userId, parentUserId}) => {
      if (!!parentUserId) {
        parentUserIds[userId] = parentUserId
      } else nonGuardiansUserIds.add(userId)
    })
    const guardianIds = new Set(Object.values(parentUserIds))
    const dependantIds = new Set(Object.keys(parentUserIds))
    const userIds = new Set([...nonGuardiansUserIds, ...guardianIds])
    const usersById = await this.getUsersById([...userIds])
    const dependantsById = await this.getDependantsById(guardianIds, usersById, dependantIds)

    // Fetch Guardians groups
    const guardiansGroups: OrganizationUsersGroup[] = await Promise.all(
      _.chunk([...guardianIds], 10).map((chunk) =>
        this.organizationService.getUsersGroups(organizationId, null, chunk),
      ),
    ).then((results) => _.flatten(results as OrganizationUsersGroup[][]))

    const allGroups = [...new Set([...(usersGroups ?? []), ...(guardiansGroups ?? [])])]
    const usersGroupsByUserId: Record<string, OrganizationUsersGroup> = {}
    allGroups.forEach((groupUser) => (usersGroupsByUserId[groupUser.userId] = groupUser))
    // Get accesses
    const accesses = await this.getAccessesFor(
      [...userIds],
      [...dependantIds],
      parentUserIds,
      locationId,
      groupId,
      betweenCreatedDate,
      usersGroupsByUserId,
      usersById,
      dependantsById,
    )

    return {
      accesses,
      asOfDateTime: live ? now().toISOString() : null,
      passportsCountByStatus: getPassportsCountPerStatus(accesses),
      hourlyCheckInsCounts: getHourlyCheckInsCounts(accesses),
    } as Stats
  }

  private getDependantsById(
    parentUserIds: Set<string> | string[],
    usersById: Record<string, User>,
    dependantIds?: Set<string>,
  ): Promise<Record<string, User>> {
    const promises = []
    parentUserIds.forEach((userId) =>
      promises.push(
        this.userService
          .getAllDependants(userId, true)
          .then((results) =>
            results
              .filter(({id}) => dependantIds.has(id))
              .map((dependant) => ({...usersById[userId], ...dependant})),
          ),
      ),
    )

    return Promise.all(promises).then((pages) => {
      const byId: Record<string, User> = {}
      pages.forEach((page) => page.forEach((dependant) => (byId[dependant.id] = dependant)))
      return byId
    })
  }

  async getUserReportTemplate(
    organization: Organization,
    primaryId: string,
    secondaryId: string,
    from: string,
    to: string,
    // lookup table with users, dependants and groups
    // likely to be needed. Some users or dependants may be missing
    partialLookup: Lookups,
    questionnaires: Questionnaire[],
  ): Promise<ReturnType<typeof userTemplate>> {
    const userId = secondaryId || primaryId
    const dependantId = secondaryId ? primaryId : null

    const [
      attestations,
      exposureTraces,
      userTraces,
      {enteringAccesses, exitingAccesses},
    ] = await Promise.all([
      this.attestationService.getAttestationsInPeriod(primaryId, from, to),
      this.attestationService.getExposuresInPeriod(primaryId, from, to),
      this.attestationService.getTracesInPeriod(userId, from, to, dependantId),
      this.getAccessHistory(from, to, primaryId, secondaryId),
    ])
    // sort by descending attestation time
    // (default ascending)
    attestations.reverse()
    const userIds = new Set<string>([userId])
    const guardians: Record<string, string> = {}
    if (dependantId) {
      guardians[dependantId] = userId
    }
    // overlaps where the other user might have been sick
    const exposureOverlaps: ExposureReport['overlapping'] = []
    exposureTraces.forEach((trace) =>
      trace.exposures.forEach((exposure) =>
        exposure.overlapping.forEach((overlap) => {
          if (
            overlap.userId === userId &&
            (dependantId ? overlap.dependant?.id === dependantId : !overlap.dependant)
          ) {
            exposureOverlaps.push(overlap)
            userIds.add(overlap.sourceUserId)
            if (overlap.sourceDependantId) {
              guardians[overlap.sourceDependantId] = overlap.sourceUserId
            }
          }
        }),
      ),
    )
    // overlaps where this user might have been sick
    const traceOverlaps: ExposureReport['overlapping'] = []
    userTraces.forEach((trace) =>
      trace.exposures.forEach((exposure) =>
        exposure.overlapping.forEach((overlap) => {
          if (
            overlap.sourceUserId === userId &&
            (dependantId ? overlap.sourceDependantId === dependantId : !overlap.sourceDependantId)
          ) {
            traceOverlaps.push(overlap)
            userIds.add(overlap.userId)
          }
          if (overlap.dependant) {
            guardians[overlap.dependant.id] = overlap.userId
          }
        }),
      ),
    )
    const missingUsers = _.uniq(
      [...userIds, ...Object.keys(guardians), ...Object.values(guardians)].filter(
        (id) => !partialLookup.usersLookup[id],
      ),
    )

    const extraLookup = missingUsers.length
      ? await this.getLookups(
          new Set(missingUsers),
          organization.id,
          partialLookup.groupsLookup,
          partialLookup.locationsLookup,
        )
      : null
    const lookups = missingUsers.length
      ? {
          ...partialLookup,
          usersLookup: {
            ...partialLookup.usersLookup,
            ...extraLookup.usersLookup,
          },
        }
      : partialLookup
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
        const enterTime = safeTimestamp(
          dependantId ? entering.dependants[dependantId].enteredAt : entering.enteredAt,
        )
        const exitTime = safeTimestamp(
          dependantId ? exiting.dependants[dependantId].exitAt : exiting.exitAt,
        )
        if (enterTime > exitTime) {
          addExit = true
        }
      }
      if (addExit) {
        const access = exitingAccesses[exitIndex]
        const location = locationsLookup[access.locationId]
        const time = toDateTimeFormat(
          dependantId ? access.dependants[dependantId].exitAt : access.exitAt,
        )
        printableAccessHistory.push({
          name: location.title,
          time,
          action: 'Exit',
        })
        exitIndex += 1
      } else {
        const access = enteringAccesses[enterIndex]
        const location = locationsLookup[access.locationId]
        const time = toDateTimeFormat(
          dependantId ? access.dependants[dependantId].enteredAt : access.enteredAt,
        )
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
      const user = usersLookup[overlap.dependant?.id ?? overlap.userId]
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
      const user = usersLookup[overlap.sourceDependantId ?? overlap.sourceUserId]
      return {
        firstName: user.firstName,
        lastName: user.lastName,
        groupName: user.group?.name ?? '',
        start: toDateTimeFormat(overlap.start),
        end: toDateTimeFormat(overlap.end),
      }
    })

    const printableAttestations = attestations.map((attestation) => {
      const answerKeys = Object.keys(attestation.answers)
      answerKeys.sort((a, b) => parseInt(a) - parseInt(b))
      const answerCount = answerKeys.length
      const questionnaire = questionnairesLookup[answerCount]
      if (!questionnaire) {
        console.warn(`no questionnaire found for attestation ${attestation.id}`)
      }
      return {
        responses: answerKeys.map((key) => {
          const yes = attestation.answers[key]['1']
          const dateOfTest =
            yes && attestation.answers[key]['2'] && toDateFormat(attestation.answers[key]['2'])
          const question =
            questionnaire?.questions[
              Object.keys(questionnaire.questions).find((qKey) => parseInt(qKey) === parseInt(key))
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
    const named = usersLookup[dependantId ?? userId] ?? deletedUser
    const {group} = named
    const namedGuardian = dependantId ? usersLookup[userId] ?? deletedUser : null
    return userTemplate({
      attestations: printableAttestations,
      locations: printableAccessHistory,
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
            this.attestationService.latestStatus(id).then((status) => ({id, status})),
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
    parentUserId: string | null,
  ): Promise<{enteringAccesses: Access[]; exitingAccesses: Access[]}> {
    const live = !from && !to

    const betweenCreatedDate = {
      from: live ? moment(now()).subtract(24, 'hours').toDate() : new Date(from),
      to: live ? now() : new Date(to),
    }
    const accesses = parentUserId
      ? await this.accessService.findAllWithDependents({
          userId: parentUserId,
          dependentId: userId,
          betweenCreatedDate,
        })
      : (
          await this.accessService.findAllWith({
            userIds: [userId],
            betweenCreatedDate,
          })
        ).filter((acc) => acc.includesGuardian)
    const enteringAccesses = accesses.filter((access) => {
      if (parentUserId) {
        return access.dependants[userId]?.enteredAt
      } else {
        return access.enteredAt
      }
    })
    const exitingAccesses = accesses.filter((access) => {
      if (parentUserId) {
        return access?.dependants[userId]?.exitAt
      } else {
        return access.exitAt
      }
    })
    enteringAccesses.sort((a, b) => {
      const aEnter = safeTimestamp(parentUserId ? a.dependants[userId].enteredAt : a.enteredAt)
      const bEnter = safeTimestamp(parentUserId ? b.dependants[userId].enteredAt : b.enteredAt)
      if (aEnter < bEnter) {
        return -1
      } else if (bEnter < aEnter) {
        return 1
      }
      return 0
    })
    exitingAccesses.sort((a, b) => {
      const aExit = safeTimestamp(parentUserId ? a.dependants[userId].exitAt : a.exitAt)
      const bExit = safeTimestamp(parentUserId ? b.dependants[userId].exitAt : b.exitAt)
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
    dependantIds: string[],
    parentUserIds: Record<string, string>,
    locationId: string | undefined,
    groupId: string | undefined,
    betweenCreatedDate: Range<Date>,
    groupsByUserId: Record<string, OrganizationUsersGroup>,
    usersById: Record<string, User>,
    dependantsByIds: Record<string, User>,
  ): Promise<AccessWithPassportStatusAndUser[]> {
    // Fetch passports
    const passportsByUserIds = await this.passportService.findTheLatestValidPassports(
      userIds,
      dependantIds,
      betweenCreatedDate.to,
    )
    const implicitPendingPassports = [...userIds, ...dependantIds]
      .filter((userId) => !passportsByUserIds[userId])
      .map(
        (userId) =>
          ({
            status: PassportStatuses.Pending,
            userId,
            parentUserId: parentUserIds[userId] ?? null,
          } as Passport),
      )

    // Fetch accesses by status-token
    const proceedStatusTokens = Object.values(passportsByUserIds)
      .filter(({status}) => status === PassportStatuses.Proceed)
      .map(({statusToken}) => statusToken)
    const accessesByStatusToken: Record<string, Access[]> = await Promise.all(
      _.chunk(proceedStatusTokens, 10).map((chunk) =>
        this.accessService.findAllWith({
          statusTokens: chunk,
          locationId,
        }),
      ),
    )
      .then((results) => _.flatten(results as Access[][]))
      .then((results) =>
        results.reduce((byStatusToken, access) => {
          if (!byStatusToken[access.statusToken]) {
            byStatusToken[access.statusToken] = []
          }
          byStatusToken[access.statusToken].push(access)
          return byStatusToken
        }, {}),
      )

    const isAccessEligibleForUserId = (userId: string) =>
      !groupId || groupsByUserId[userId]?.groupId === groupId

    // Remap accesses
    const accesses = [...implicitPendingPassports, ...Object.values(passportsByUserIds)]
      .filter(({userId}) => isAccessEligibleForUserId(userId))
      .map(({userId, status, statusToken}) => {
        const user = usersById[userId] ?? dependantsByIds[userId]
        const parentUserId =
          passportsByUserIds[userId]?.parentUserId ??
          implicitPendingPassports.find((passport) => passport.userId === userId)?.parentUserId
        if (!user) {
          if (userIds.includes(userId)) {
            console.warn(`Invalid state exception: Cannot find user for ID [${userId}]`)
          } else if (dependantIds.includes(userId)) {
            console.warn(
              `Invalid state exception: Cannot find dependant for ID [${userId}], guardian [${parentUserIds[userId]}]`,
            )
          } else {
            console.warn(`[${userId}] is not in userIds or dependantIds`)
          }
          return null
        }
        // access which represents the user's present location
        const activeAccess = (accessesByStatusToken[statusToken] || [])
          .filter((access) =>
            parentUserId
              ? access.userId === parentUserId && access.dependants[userId]
              : access.userId === userId && access.includesGuardian,
          )
          .map((access) => ({
            ...access,
            enteredAt: parentUserId
              ? ((access.dependants[userId]?.enteredAt ?? null) as string)
              : access.enteredAt,
            exitAt: parentUserId
              ? ((access.dependants[userId]?.exitAt ?? null) as string)
              : access.exitAt,
            status,
            user,
            userId,
          }))
          .reduce(getPriorityAccess, null)
        const access = activeAccess ?? {
          token: null,
          statusToken: null,
          locationId: null,
          createdAt: null,
          enteredAt: null,
          exitAt: null,
          includesGuardian: null,
          dependants: null,
        }

        return {
          ...access,
          userId,
          user,
          status,
          enteredAt: access.enteredAt,
          exitAt: access.exitAt,
          parentUserId,
          groupId,
        }
      })
      .filter((access) => !!access)

    // Handle duplicates
    const distinctAccesses: Record<string, AccessWithPassportStatusAndUser> = {}
    const normalize = (s?: string): string => (!!s ? s.toLowerCase().trim() : '')
    accesses.forEach(({user, status, ...access}) => {
      if (!groupsByUserId[user.id]) {
        console.log('Invalid state: Cannot find group for user: ', user.id)
        return
      }
      const duplicateKey = `${normalize(user.firstName)}|${normalize(user.lastName)}|${
        groupsByUserId[user.id]?.groupId
      }`
      distinctAccesses[duplicateKey] = getPriorityAccess(distinctAccesses[duplicateKey], {
        ...access,
        user,
        status,
      })
    })
    return Object.values(distinctAccesses)
  }
}
