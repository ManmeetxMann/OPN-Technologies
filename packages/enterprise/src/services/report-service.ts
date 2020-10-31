import {Config} from '../../../common/src/utils/config'
import {now} from '../../../common/src/utils/times'
import {UserService} from '../../../common/src/service/user/user-service'
import {User, UserDependant} from '../../../common/src/data/user'
import {Range} from '../../../common/src/types/range'

import {OrganizationService} from './organization-service'
import {
  OrganizationGroup,
  OrganizationLocation,
  OrganizationUsersGroup,
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

const timeZone = Config.get('DEFAULT_TIME_ZONE')

type AugmentedDependant = UserDependant & {group: OrganizationGroup; status: PassportStatus}
type AugmentedUser = User & {group: OrganizationGroup; status: PassportStatus}
type Lookups = {
  usersLookup: Record<string, AugmentedUser> // users by id (with group and status)
  dependantsLookup: Record<string, AugmentedDependant> // dependants by id (with group and status)
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
): Record<PassportStatus, number> =>
  accesses
    .map(({status}) => status)
    .reduce((byStatus, status) => ({...byStatus, [status]: byStatus[status] + 1}), {
      [PassportStatuses.Pending]: 0,
      [PassportStatuses.Proceed]: 0,
      [PassportStatuses.Caution]: 0,
      [PassportStatuses.Stop]: 0,
    })

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
    const dependantsById = await this.getDependantsById([...guardianIds], usersById, dependantIds)

    // Fetch Guardians groups
    const guardiansGroups: OrganizationUsersGroup[] = await Promise.all(
      _.chunk([...guardianIds], 10).map((chunk) =>
        this.organizationService.getUsersGroups(organizationId, null, chunk),
      ),
    ).then((results) => _.flatten(results as OrganizationUsersGroup[][]))

    const groupsUsersByUserId: Record<string, OrganizationUsersGroup> = [
      ...new Set([...(usersGroups ?? []), ...(guardiansGroups ?? [])]),
    ].reduce(
      (byUserId, groupUser) => ({
        ...byUserId,
        [groupUser.userId]: groupUser,
      }),
      {},
    )

    // Get accesses
    const accesses = await this.getAccessesFor(
      [...userIds],
      [...dependantIds],
      parentUserIds,
      locationId,
      groupId,
      betweenCreatedDate,
      groupsUsersByUserId,
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
    parentUserIds: string[],
    usersById: Record<string, User>,
    dependantIds?: Set<string>,
  ): Promise<Record<string, User>> {
    return Promise.all(
      parentUserIds.map((userId) =>
        this.userService
          .getAllDependants(userId)
          .then((results) =>
            results
              .filter(({id}) => dependantIds.has(id))
              .map((dependant) => ({...usersById[userId], ...dependant})),
          ),
      ),
    ).then((dependants) =>
      _.flatten(dependants).reduce((byId, dependant) => ({...byId, [dependant.id]: dependant}), {}),
    )
  }

  async getUserReportTemplate(
    organizationId: string,
    primaryId: string,
    secondaryId: string,
    from: string,
    to: string,
  ): Promise<ReturnType<typeof userTemplate>> {
    const userId = (secondaryId || primaryId) as string
    const dependantId = secondaryId ? (primaryId as string) : null

    const [
      organization,
      attestations,
      exposureTraces,
      userTraces,
      {enteringAccesses, exitingAccesses},
    ] = await Promise.all([
      this.organizationService.findOneById(organizationId),
      this.attestationService.getAttestationsInPeriod(
        primaryId as string,
        from as string,
        to as string,
      ),
      this.attestationService.getExposuresInPeriod(
        primaryId as string,
        from as string,
        to as string,
      ),
      this.attestationService.getTracesInPeriod(userId, from as string, to as string, dependantId),
      this.getAccessHistory(
        from as string,
        to as string,
        primaryId as string,
        secondaryId as string,
      ),
    ])
    // sort by descending attestation time
    attestations.sort((a, b) =>
      new Date(a.attestationTime) < new Date(b.attestationTime) ? 1 : -1,
    )
    const userIds = new Set<string>([userId])
    const dependantIds = new Set<string>()
    if (dependantId) {
      dependantIds.add(dependantId)
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
              dependantIds.add(overlap.sourceDependantId)
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
        }),
      ),
    )

    const lookups = await this.getLookups(userIds, dependantIds, organizationId)
    const {locationsLookup, usersLookup, dependantsLookup, groupsLookup} = lookups

    const questionnaireIds = new Set<string>()
    Object.values(locationsLookup).forEach((location) => {
      if (location.questionnaireId) {
        questionnaireIds.add(location.questionnaireId)
      }
    })
    const questionnaires = await Promise.all(
      [...questionnaireIds].map((id) => this.questionnaireService.getQuestionnaire(id)),
    )

    const questionnairesLookup: Record<number, Questionnaire> = questionnaires.reduce(
      (lookupSoFar, questionnaire) => {
        const count = Object.keys(questionnaire.questions).length
        if (lookupSoFar[count]) {
          console.warn(`Multiple questionnaires with ${count} questions`)
          return lookupSoFar
        }
        return {
          ...lookupSoFar,
          [count]: questionnaire,
        }
      },
      {},
    )

    const dateFormat = 'MMMM D, YYYY'
    const dateTimeFormat = 'h:mm A MMMM D, YYYY'

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
        const enterTime = new Date(
          // @ts-ignore dependant dates are actually strings
          dependantId ? entering.dependants[dependantId].enteredAt : entering.enteredAt,
        )
        const exitTime = new Date(
          // @ts-ignore dependant dates are actually strings
          dependantId ? exiting.dependants[dependantId].exitAt : exiting.exitAt,
        )
        if (enterTime > exitTime) {
          addExit = true
        }
      }
      if (addExit) {
        const access = exitingAccesses[exitIndex]
        const location = locationsLookup[access.locationId]
        const time = moment(
          //@ts-ignore dependant dates are actually strings
          dependantId ? access.dependants[dependantId].exitAt : access.exitAt,
        )
          .tz(timeZone)
          .format(dateTimeFormat)
        printableAccessHistory.push({
          name: location.title,
          time,
          action: 'Exit',
        })
        exitIndex += 1
      } else {
        const access = enteringAccesses[enterIndex]
        const location = locationsLookup[access.locationId]
        const time = moment(
          // @ts-ignore this is an ISO string
          dependantId ? access.dependants[dependantId].enteredAt : access.enteredAt,
        )
          .tz(timeZone)
          .format(dateTimeFormat)
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
    const printableTraces = traceOverlaps.map((overlap) => ({
      firstName: overlap.dependant
        ? overlap.dependant.firstName
        : usersLookup[overlap.userId].firstName,
      lastName: overlap.dependant
        ? overlap.dependant.lastName
        : usersLookup[overlap.userId].lastName,
      groupName:
        (overlap.dependant
          ? groupsLookup[overlap.dependant.groupId]
          : usersLookup[overlap.userId].group
        )?.name ?? '',
      // @ts-ignore this is a timestamp, not a date
      start: moment(overlap.start.toDate()).tz(timeZone).format(dateTimeFormat),
      // @ts-ignore this is a timestamp, not a date
      end: moment(overlap.end.toDate()).tz(timeZone).format(dateTimeFormat),
    }))
    // perpetrators
    const printableExposures = exposureOverlaps.map((overlap) => ({
      firstName: (overlap.sourceDependantId
        ? dependantsLookup[overlap.sourceDependantId]
        : usersLookup[overlap.sourceUserId]
      ).firstName,
      lastName: (overlap.sourceDependantId
        ? dependantsLookup[overlap.sourceDependantId]
        : usersLookup[overlap.sourceUserId]
      ).lastName,
      groupName:
        (overlap.sourceDependantId
          ? dependantsLookup[overlap.sourceDependantId]
          : usersLookup[overlap.sourceUserId]
        )?.group.name ?? '',
      // @ts-ignore this is a timestamp, not a date
      start: moment(overlap.start.toDate()).tz(timeZone).format(dateTimeFormat),
      // @ts-ignore this is a timestamp, not a date
      end: moment(overlap.end.toDate()).tz(timeZone).format(dateTimeFormat),
    }))

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
            yes &&
            attestation.answers[key]['2'] &&
            moment(attestation.answers[key]['2']).tz(timeZone).format(dateFormat)
          return {
            question: (questionnaire?.questions[key]?.value ?? `Question ${key}`) as string,
            response: yes ? dateOfTest || 'Yes' : 'No',
          }
        }),
        // @ts-ignore timestamp, not string
        time: moment(attestation.attestationTime.toDate()).tz(timeZone).format(dateTimeFormat),
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
    const named = (dependantId ? dependantsLookup[dependantId] : usersLookup[userId]) ?? deletedUser
    const {group} = named
    const namedGuardian = dependantId ? usersLookup[userId] ?? deletedUser : null
    return userTemplate({
      attestations: printableAttestations,
      locations: printableAccessHistory,
      exposures: printableExposures,
      traces: printableTraces,
      organizationName: organization.name,
      userGroup: group.name,
      userName: `${named.firstName} ${named.lastName}`,
      guardianName: namedGuardian ? `${namedGuardian.firstName} ${namedGuardian.lastName}` : null,
      generationDate: moment(now()).tz(timeZone).format(dateFormat),
      reportDate: `${moment(from).tz(timeZone).format(dateFormat)} - ${moment(to)
        .tz(timeZone)
        .format(dateFormat)}`,
    })
  }

  private getUsersById(userIds: string[]): Promise<Record<string, User>> {
    const chunks = _.chunk(userIds, 10) as string[][]
    return Promise.all(
      chunks.map((userIds) => this.userService.findAllBy({userIds})),
    ).then((results) =>
      results
        ?.reduce((flatted, chunks) => [...flatted, ...chunks], [])
        .reduce((byId, user) => ({...byId, [user.id]: user}), {}),
    )
  }

  async getLookups(
    userIds: Set<string>,
    dependantIds: Set<string>,
    organizationId: string,
  ): Promise<Lookups> {
    // N queries
    const statuses = await Promise.all(
      [...dependantIds, ...userIds].map(
        async (id): Promise<{id: string; status: PassportStatus}> => ({
          id,
          status: await this.attestationService.latestStatus(id),
        }),
      ),
    )
    // keyed by user or dependant ID
    const statusesByUserOrDependantId: Record<string, PassportStatus> = statuses.reduce(
      (lookup, curr) => ({...lookup, [curr.id]: curr.status}),
      {},
    )
    const allUsers = Object.values(await this.getUsersById([...userIds]))

    const allDependants: UserDependant[] = _.flatten(
      await Promise.all([...userIds].map((id) => this.userService.getAllDependants(id))),
    )

    // every group this organization contains
    const allGroups = await this.organizationService.getGroups(organizationId)
    const groupsById: Record<string, OrganizationGroup> = allGroups.reduce(
      (lookup, group) => ({...lookup, [group.id]: group}),
      {},
    )
    // every location this organization contains
    const allLocations = await this.organizationService.getAllLocations(organizationId)
    const locationsById: Record<string, OrganizationLocation> = allLocations.reduce(
      (lookup, location) => ({...lookup, [location.id]: location}),
      {},
    )
    // group memberships for all the users and dependants we're interested in
    const userGroups = await this.organizationService.getUsersGroups(organizationId, null, [
      ...userIds,
      ...dependantIds,
    ])
    const groupsByUserOrDependantId: Record<string, OrganizationGroup> = userGroups.reduce(
      (lookup, groupLink) => ({...lookup, [groupLink.userId]: groupsById[groupLink.groupId]}),
      {},
    )
    const dependantsById: Record<string, AugmentedDependant> = allDependants
      .map(
        (dependant): AugmentedDependant => ({
          ...dependant,
          group: groupsByUserOrDependantId[dependant.id],
          status: statusesByUserOrDependantId[dependant.id],
        }),
      )
      .reduce(
        (lookup, dependant) => ({
          ...lookup,
          [dependant.id]: dependant,
        }),
        {},
      )
    const usersById: Record<string, AugmentedUser> = allUsers.reduce(
      (lookup, user) => ({
        ...lookup,
        [user.id]: {
          ...user,
          group: groupsByUserOrDependantId[user.id],
          stattus: statusesByUserOrDependantId[user.id],
        },
      }),
      {},
    )
    return {
      usersLookup: usersById,
      dependantsLookup: dependantsById,
      locationsLookup: locationsById,
      groupsLookup: groupsById,
      membershipLookup: groupsByUserOrDependantId,
      statusesLookup: statusesByUserOrDependantId,
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
      // @ts-ignore timestamps are actually strings
      const aEnter = new Date(parentUserId ? a.dependants[userId].enteredAt : a.enteredAt)
      // @ts-ignore timestamps are actually strings
      const bEnter = new Date(parentUserId ? b.dependants[userId].enteredAt : b.enteredAt)
      if (aEnter < bEnter) {
        return -1
      } else if (bEnter < aEnter) {
        return 1
      }
      return 0
    })
    exitingAccesses.sort((a, b) => {
      // @ts-ignore timestamps are actually strings
      const aExit = new Date(parentUserId ? a.dependants[userId].exitAt : a.exitAt)
      // @ts-ignore timestamps are actually strings
      const bExit = new Date(parentUserId ? b.dependants[userId].exitAt : b.exitAt)
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
        results.reduce(
          (byStatusToken, access) => ({
            ...byStatusToken,
            [access.statusToken]: [...(byStatusToken[access.statusToken] ?? []), access],
          }),
          {},
        ),
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