import {IdentifiersModel} from '../../../common/src/data/identifiers'
import {UserDependant, LegacyDependant} from '../../../common/src/data/user'
import {UserService} from '../../../common/src/service/user/user-service'
import DataStore from '../../../common/src/data/datastore'
import {AccessModel, AccessRepository} from '../repository/access.repository'
import {Access, AccessFilter, AccessWithDependantNames} from '../models/access'
import {firestore} from 'firebase-admin'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {AccessStatsModel, AccessStatsRepository} from '../repository/access-stats.repository'
import AccessListener from '../effects/addToAttendance'
import moment from 'moment-timezone'
import {serverTimestamp, now} from '../../../common/src/utils/times'
import * as _ from 'lodash'
import {PassportStatus} from '../../../passport/src/models/passport'

import {OrganizationUsersGroupModel} from '../../../enterprise/src/repository/organization.repository'

import {AccessStatsFilter} from '../models/access-stats'
import {Config} from '../../../common/src/utils/config'
import {AccessFilterWithDependent} from '../types'
import {safeTimestamp} from '../../../common/src/utils/datetime-util'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

export class AccessService {
  private dataStore = new DataStore()
  private identifier = new IdentifiersModel(this.dataStore)
  private accessRepository = new AccessRepository(this.dataStore)
  private accessStatsRepository = new AccessStatsRepository(this.dataStore)
  private accessListener = new AccessListener(this.dataStore)
  private userService = new UserService()

  public static mapAccessDates = (access: Access): Access => ({
    ...access,
    //@ts-ignore
    createdAt: access.createdAt.toDate().toISOString(),
    //@ts-ignore
    enteredAt: access.enteredAt?.toDate().toISOString(),
    //@ts-ignore
    exitAt: access.exitAt?.toDate().toISOString(),
    //@ts-ignore
    dependants: Object.values(access.dependants)
      .map(({id, enteredAt, exitAt}) => ({
        id,
        //@ts-ignore
        enteredAt: enteredAt?.toDate().toISOString(),
        //@ts-ignore
        exitAt: exitAt?.toDate().toISOString(),
      }))
      .reduce((byId, entry) => ({...byId, [entry.id]: entry}), {}),
  })

  create(
    statusToken: string,
    locationId: string,
    userId: string,
    includesGuardian: boolean,
    dependantIds: string[],
    delegateAdminUserId?: string,
  ): Promise<AccessModel> {
    const dependants = {}
    dependantIds.forEach(
      (id) =>
        (dependants[id] = {
          id,
        }),
    )

    return this.identifier
      .getUniqueValue('access')
      .then((token) =>
        this.accessRepository.add({
          token,
          locationId,
          statusToken,
          userId,
          createdAt: serverTimestamp(),
          includesGuardian,
          dependants,
          delegateAdminUserId,
        }),
      )
      .then(({createdAt, ...access}) => ({
        ...access,
        // @ts-ignore
        createdAt: new firestore.Timestamp(createdAt.seconds, createdAt.nanoseconds)
          .toDate()
          .toISOString(),
      }))
  }

  // TODO: remove once frontend no longer expects groupId
  private async decorateDependants(
    dependants: UserDependant[],
  ): Promise<(UserDependant & LegacyDependant)[]> {
    const allOrgs = new Set<string>(_.flatten(_.map(dependants, 'organizationIds')))
    const groups = _.flatten(
      await Promise.all(
        [...allOrgs].map((orgId) =>
          new OrganizationUsersGroupModel(this.dataStore, orgId).findWhereIn(
            'userId',
            _.map(dependants, 'id'),
          ),
        ),
      ),
    )

    return dependants.map((dep) => ({
      ...dep,
      groupId: groups.find((group) => group.userId === dep.id)?.groupId ?? '',
    }))
  }

  handleEnter(rawAccess: AccessModel): Promise<AccessWithDependantNames> {
    // createdAt could be a string, and we don't want to rewrite it
    const access: AccessModel = _.omit(rawAccess, ['createdAt'])

    if (!!access.enteredAt || !!access.exitAt) {
      throw new BadRequestException('Token already used to enter or exit')
    }
    // all dependants named in the access enter, no need to filter here
    for (const id in access.dependants) {
      if (!!access.dependants[id].enteredAt || !!access.dependants[id].exitAt) {
        throw new BadRequestException('Token already used to enter or exit')
      }
    }
    const dependants = {}
    for (const id in access.dependants) {
      dependants[id] = {
        ...access.dependants[id],
        enteredAt: serverTimestamp(),
      }
    }
    const newAccess = access.includesGuardian
      ? {
          ...access,
          enteredAt: serverTimestamp(),
          dependants,
        }
      : {
          ...access,
          dependants,
        }
    const activeUserId =
      access.includesGuardian || Object.keys(access.dependants).length > 1
        ? access.userId
        : Object.keys(access.dependants)[0]
    const count = Object.keys(dependants).length + (access.includesGuardian ? 1 : 0)

    console.log(`Processed an ENTER for Access id: ${access.id}`)
    return this.accessRepository.update(newAccess).then((savedAccess) =>
      this.incrementPeopleOnPremises(access.locationId, count)
        .then(() =>
          Object.keys(savedAccess.dependants ?? {}).length > 0
            ? this.userService.getAllDependants(access.userId)
            : ([] as UserDependant[]),
        )
        .then(async (dependants) => {
          // we deliberately don't await this, the user doesn't need to know if it goes through
          this.accessListener.addEntry(savedAccess)
          const decorated = await this.decorateDependants(
            (dependants ?? []).filter(({id}) => !!savedAccess.dependants[id]),
          )
          return {
            ...{
              ...savedAccess,
              enteredAt: now().toISOString(),
              exitAt: null,
              // frontend expects this to be the id of the person who entered (if there was only one person)
              userId: activeUserId,
              parentUserId: activeUserId !== access.userId ? access.userId : null,
            },
            dependants: decorated,
          }
        }),
    )
  }

  handleExit(rawAccess: AccessModel): Promise<AccessWithDependantNames> {
    // createdAt could be a string, and we don't want to rewrite it
    const access: AccessModel = _.omit(rawAccess, ['createdAt'])

    const {includesGuardian} = access
    const dependantIds = Object.keys(access.dependants)
    if (!includesGuardian && !dependantIds.length) {
      throw new BadRequestException('Must specify at least one user')
    }
    if (includesGuardian) {
      if (!!access.exitAt) {
        throw new BadRequestException('Token already used to exit')
      }
    }
    if (dependantIds.some((id) => !!access.dependants[id].exitAt)) {
      throw new BadRequestException('Token already used to exit')
    }

    const enteredAt = [
      access.enteredAt,
      ...Object.values(access.dependants).map((dep) => dep.enteredAt),
    ].reduce((min, curr) => {
      if (curr) {
        if (!min || curr < min) {
          return curr
        }
      }
      return min
    }, null)
    const enteredAtStr = enteredAt
      ? typeof enteredAt === 'string'
        ? enteredAt
        : (enteredAt as firestore.Timestamp).toDate().toISOString()
      : null

    const newDependants = dependantIds.reduce(
      (byId, id) => ({
        ...byId,
        [id]: {
          ...access.dependants[id],
          exitAt: serverTimestamp(),
        },
      }),
      {},
    )

    const newAccess = includesGuardian
      ? {
          ...access,
          dependants: newDependants,
          exitAt: serverTimestamp(),
        }
      : {
          ...access,
          dependants: newDependants,
        }
    const count = dependantIds.length + (includesGuardian ? 1 : 0)
    const activeUserId =
      access.includesGuardian || Object.keys(access.dependants).length > 1
        ? access.userId
        : Object.keys(access.dependants)[0]

    console.log(`Processed an EXIT for Access id: ${access.id}`)
    return this.accessRepository.update(newAccess).then((savedAccess) =>
      this.decreasePeopleOnPremises(access.locationId, count)
        .then(() =>
          _.isEmpty(savedAccess.dependants)
            ? ([] as UserDependant[])
            : this.userService.getAllDependants(access.userId),
        )
        .then((dependants) =>
          dependants.filter(({id}) => !!savedAccess.dependants[id] && dependantIds.includes(id)),
        )
        .then(async (dependants) => {
          this.accessListener.addExit(savedAccess, includesGuardian, dependantIds)
          const decorated = await this.decorateDependants(dependants)
          return {
            ...{
              ...savedAccess,
              enteredAt: enteredAtStr,
              exitAt: now().toISOString(),
              // frontend expects this to be the id of the person who exited (if there was only one person)
              userId: activeUserId,
              parentUserId: activeUserId !== access.userId ? access.userId : null,
            },
            dependants: decorated,
          }
        }),
    )
  }

  findOneByToken(token: string): Promise<AccessModel> {
    return this.accessRepository.findWhereEqual('token', token).then((results) => {
      if (results?.length > 0) {
        return results[0]
      }
      throw new ResourceNotFoundException(`Cannot find access with token [${token}]`)
    })
  }

  findAllWith({
    userIds,
    statusTokens,
    betweenCreatedDate,
    locationId,
  }: AccessFilter): Promise<Access[]> {
    // @ts-ignore
    let query = this.accessRepository.collection()

    if (userIds?.length) {
      // @ts-ignore
      query = query.where('userId', 'in', userIds)
    }

    if (statusTokens?.length) {
      // @ts-ignore
      query = query.where('statusToken', 'in', statusTokens)
    }

    if (locationId) {
      // @ts-ignore
      query = query.where('locationId', '==', locationId)
    }
    if (betweenCreatedDate) {
      const {from, to} = betweenCreatedDate
      if (from) {
        // @ts-ignore
        query = query.where('createdAt', '>=', from)
      }
      if (to) {
        // @ts-ignore
        query = query.where('createdAt', '<=', to)
      }
    }

    const hasFilter = userIds || statusTokens || locationId || betweenCreatedDate
    // @ts-ignore
    return (hasFilter ? query.fetch() : query.fetchAll()).then((accesses) =>
      accesses.map(AccessService.mapAccessDates),
    )
  }

  async findAllWithDependents({
    userId,
    dependentId,
    betweenCreatedDate,
    locationId,
  }: AccessFilterWithDependent): Promise<Access[]> {
    // @ts-ignore
    let query = this.accessRepository.collection()

    if (userId) {
      // @ts-ignore
      query = query.where('userId', '==', userId)
    }
    if (locationId) {
      // @ts-ignore
      query = query.where('locationId', '==', locationId)
    }
    if (betweenCreatedDate) {
      const {from, to} = betweenCreatedDate
      if (from) {
        // @ts-ignore
        query = query.where('createdAt', '>=', from)
      }
      if (to) {
        // @ts-ignore
        query = query.where('createdAt', '<=', to)
      }
    }

    // @ts-ignore
    const accesses = await query.fetch()

    //@ts-ignore
    const filteredAccesses = (accesses as Access[])
      .map(
        (access: Access): Access => ({
          ...access,
          //@ts-ignore
          createdAt: access.createdAt.toDate().toISOString(),
          //@ts-ignore
          enteredAt: access.enteredAt?.toDate().toISOString(),
          //@ts-ignore
          exitAt: access.exitAt?.toDate().toISOString(),
          dependants: Object.values(access.dependants)
            .map(({id, enteredAt, exitAt}) => {
              return {
                id,
                //@ts-ignore
                enteredAt: enteredAt?.toDate().toISOString(),
                //@ts-ignore
                exitAt: exitAt?.toDate().toISOString(),
              }
            })
            .reduce((all, curr) => ({...all, [curr.id]: curr}), {}),
        }),
      )
      .filter((item) => item.dependants && item.dependants[dependentId])

    // @ts-ignore
    return filteredAccesses
  }

  async findLatest(
    userId: string,
    parentUserId: string | null,
    locationId: string,
    onCreatedDate: Date,
    delegateAdminUserId?: string,
  ): Promise<AccessModel> {
    const isADependant = !!parentUserId
    const from = moment(safeTimestamp(onCreatedDate)).tz(timeZone).startOf('day').toDate()
    const to = moment(safeTimestamp(onCreatedDate)).tz(timeZone).endOf('day').toDate()
    const primaryUserId = isADependant ? parentUserId : userId
    const getBaseQuery = () => {
      const base = this.accessRepository
        .collection()
        .where('locationId', '==', locationId)
        //@ts-ignore
        .where('timestamps.createdAt', '>=', from)
        //@ts-ignore
        .where('timestamps.createdAt', '<=', to)
        .where(`userId`, '==', primaryUserId)
        //@ts-ignore
        .orderBy('timestamps.createdAt', 'desc')
      if (delegateAdminUserId) {
        return base.where('delegateAdminUserId', '==', delegateAdminUserId)
      }
      return base
    }

    const accesses = (await getBaseQuery().fetch()).filter((acc) =>
      isADependant ? acc.dependants[userId] : acc.includesGuardian,
    )

    accesses.sort((a, b) =>
      // @ts-ignore
      safeTimestamp(a.timestamps.createdAt) < safeTimestamp(b.timestamps.createdAt) ? 1 : -1,
    )
    return accesses.length > 0 ? accesses[0] : null

    // .then((accesses) =>
    //   accesses.map(AccessService.mapAccessDates),
    // )
  }
  async findLatestAnywhere(userId: string, delegateIds: string[]): Promise<AccessModel> {
    // TODO: these queries can be greatly improved if we guarantee single-user accesses
    // also, this 'forgets' accesses older than 48 hours, which would be fixable
    const from = moment(now()).subtract(48, 'hours').toDate()
    const directAccessQuery = this.accessRepository
      .collection()
      .where(`userId`, '==', userId)
      //@ts-ignore
      .where('timestamps.createdAt', '>=', from)
      //@ts-ignore
      .orderBy('timestamps.createdAt', 'desc')
    const indirectAccessQueries = delegateIds.map((id) =>
      this.accessRepository
        .collection()
        .where(`userId`, '==', id)
        //@ts-ignore
        .where('timestamps.createdAt', '>=', from)
        //@ts-ignore
        .orderBy('timestamps.createdAt', 'desc'),
    )
    const allAccesses: AccessModel[] = (_.flatten(
      await Promise.all([directAccessQuery, ...indirectAccessQueries].map(({fetch}) => fetch())),
    ) as AccessModel[])
      .map((access) => {
        const isDirect = access.userId === userId
        if (isDirect && !access.includesGuardian) {
          return null
        }
        const timestampBearer = isDirect ? access : access.dependants && access.dependants[userId]
        if (!timestampBearer) {
          return null
        }
        const activeTime = timestampBearer?.exitAt || timestampBearer?.enteredAt
        if (!activeTime) {
          return null
        }
        return {
          ...access,
          activeTime: safeTimestamp(activeTime),
        }
      })
      .filter((notNull) => notNull)
      .sort((a, b) => (a.activeTime < b.activeTime ? 1 : -1))
      .map(({activeTime, ...access}) => access)
    return allAccesses.length > 0 ? allAccesses[0] : null
  }

  async getTodayStatsForLocation(locationId: string): Promise<AccessStatsModel> {
    return await this.getTodayStatsForLocations([locationId])
  }

  async getTodayStatsForLocations(locationIds: string[]): Promise<AccessStatsModel> {
    const today = moment(now()).tz(timeZone).startOf('day')
    const fromDate = today.toDate()
    const toDate = today.add(1, 'day').add(-1, 'second').toDate()

    const statsByLocationId = await this.getStatsWith({
      locationIds,
      fromDate,
      toDate,
    }).then((stats) =>
      stats.reduce((byLocationId, stat) => ({...byLocationId, [stat.locationId]: stat}), {}),
    )
    return Promise.all(
      locationIds.map((locationId) =>
        statsByLocationId[locationId]
          ? statsByLocationId[locationId]
          : this.newStatsFor(locationId),
      ),
    ).then((allStats) =>
      allStats.length === 1
        ? allStats[0]
        : allStats.reduce(
            (sum, current) => {
              sum.peopleOnPremises += current.peopleOnPremises
              sum.accessDenied += current.accessDenied
              sum.exposures += current.exposures
              sum.pendingPassports += current.pendingPassports
              sum.proceedPassports += current.proceedPassports
              sum.cautionPassports += current.cautionPassports
              sum.stopPassports += current.stopPassports
              return sum
            },
            {
              id: '',
              locationId: '',
              peopleOnPremises: 0,
              accessDenied: 0,
              exposures: 0,
              pendingPassports: 0,
              proceedPassports: 0,
              cautionPassports: 0,
              stopPassports: 0,
              asOfDateTime: new Date(),
              checkInsPerHour: [],
              createdAt: new firestore.Timestamp(0, 0),
            },
          ),
    )
  }

  getStatsWith({locationIds, toDate, fromDate}: AccessStatsFilter): Promise<AccessStatsModel[]> {
    return Promise.all(
      _.chunk([...locationIds], 10).map((chunk) => {
        let query = this.dataStore.firestoreORM
          .collection<AccessStatsModel>({path: this.accessStatsRepository.rootPath})
          .where('locationId', 'in', chunk)

        if (fromDate) {
          query = query.where('createdAt', '>=', fromDate)
        }

        if (toDate) {
          query = query.where('createdAt', '<=', toDate)
        }

        return query.fetch()
      }),
    ).then((results) => _.flatten(results as AccessStatsModel[][]))
  }

  incrementPeopleOnPremises(locationId: string, count = 1): Promise<AccessStatsModel> {
    return this.getTodayStatsForLocation(locationId).then((stats) =>
      this.accessStatsRepository.increment(stats.id, 'peopleOnPremises', count),
    )
  }

  decreasePeopleOnPremises(locationId: string, count = 1): Promise<AccessStatsModel> {
    return this.getTodayStatsForLocation(locationId).then((stats) =>
      stats.peopleOnPremises > 0
        ? this.accessStatsRepository.increment(
            stats.id,
            'peopleOnPremises',
            Math.min(stats.peopleOnPremises, count) * -1,
          )
        : stats,
    )
  }

  incrementAccessDenied(locationId: string, count = 1): Promise<AccessStatsModel> {
    return this.getTodayStatsForLocation(locationId).then((stats) =>
      this.accessStatsRepository.increment(stats.id, 'accessDenied', count),
    )
  }

  incrementTodayPassportStatusCount(
    locationId: string,
    status: PassportStatus,
    count = 1,
  ): Promise<AccessStatsModel> {
    return this.getTodayStatsForLocation(locationId).then((stats) =>
      this.accessStatsRepository.increment(stats.id, `${status}Passport`, count),
    )
  }

  private newStatsFor(locationId: string): Promise<AccessStatsModel> {
    return this.accessStatsRepository.add({
      locationId,
      peopleOnPremises: 0,
      accessDenied: 0,
      exposures: 0,
      pendingPassports: 0,
      proceedPassports: 0,
      cautionPassports: 0,
      stopPassports: 0,
      createdAt: serverTimestamp(),
    } as AccessStatsModel)
  }
}
