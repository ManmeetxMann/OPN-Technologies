import {IdentifiersModel} from '../../../common/src/data/identifiers'
import {UserDependant, UserDependantModel} from '../../../common/src/data/user'
import DataStore from '../../../common/src/data/datastore'
import {AccessModel, AccessRepository} from '../repository/access.repository'
import {Access, AccessFilter} from '../models/access'
import {firestore} from 'firebase-admin'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {AccessStatsModel, AccessStatsRepository} from '../repository/access-stats.repository'
import AccessListener from '../effects/addToAttendance'
import moment from 'moment-timezone'
import {serverTimestamp, now} from '../../../common/src/utils/times'
import * as _ from 'lodash'
import {flattern} from '../../../common/src/utils/utils'
import {PassportStatus} from '../../../passport/src/models/passport'
import {AccessStatsFilter} from '../models/access-stats'
import {Config} from '../../../common/src/utils/config'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

// a regular access, but with the names of dependants fetched
type AccessWithDependantNames = Omit<Access, 'dependants'> & {
  dependants: UserDependant[]
}

export class AccessService {
  private dataStore = new DataStore()
  private identifier = new IdentifiersModel(this.dataStore)
  private accessRepository = new AccessRepository(this.dataStore)
  private accessStatsRepository = new AccessStatsRepository(this.dataStore)
  private accessListener = new AccessListener(this.dataStore)

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
  ): Promise<Access> {
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

  handleEnter(access: AccessModel): Promise<AccessWithDependantNames> {
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
    const count = Object.keys(dependants).length + (access.includesGuardian ? 1 : 0)
    return this.accessRepository.update(newAccess).then((savedAccess) =>
      this.incrementPeopleOnPremises(access.locationId, count)
        .then(() =>
          Object.keys(savedAccess.dependants ?? {}).length > 0
            ? new UserDependantModel(this.dataStore, access.userId).fetchAll()
            : ([] as UserDependant[]),
        )
        .then((dependants) => {
          // we deliberately don't await this, the user doesn't need to know if it goes through
          this.accessListener.addEntry(savedAccess)
          return {
            ...savedAccess,
            dependants: (dependants ?? []).filter(({id}) => !!savedAccess.dependants[id]),
          }
        }),
    )
  }

  handleExit(access: AccessModel): Promise<AccessWithDependantNames> {
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
    return this.accessRepository.update(newAccess).then((savedAccess) =>
      this.decreasePeopleOnPremises(access.locationId, count)
        .then(() =>
          _.isEmpty(savedAccess.dependants)
            ? ([] as UserDependant[])
            : new UserDependantModel(this.dataStore, access.userId).fetchAll(),
        )
        .then((dependants) =>
          dependants.filter(({id}) => !!savedAccess.dependants[id] && dependantIds.includes(id)),
        )
        .then(async (dependants) => {
          await this.accessListener.addExit(savedAccess, includesGuardian, dependantIds)
          return {...savedAccess, dependants}
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

  findAllWith({userIds, betweenCreatedDate, locationId}: AccessFilter): Promise<Access[]> {
    // @ts-ignore
    let query = this.accessRepository.collection()

    if (userIds?.length) {
      // @ts-ignore
      query = query.where('userId', 'in', userIds)
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

    const hasFilter = userIds || locationId || betweenCreatedDate
    // @ts-ignore
    return (hasFilter ? query.fetch() : query.fetchAll()).then((accesses) =>
      accesses.map(AccessService.mapAccessDates),
    )
  }

  async getTodayStatsForLocations(locationIds: string[]): Promise<AccessStatsModel> {
    const today = moment(now()).tz(timeZone).startOf('day')
    const fromDate = today.toDate()
    const toDate = today.add(1, 'day').add(-1, 'second').toDate()

    // Deal with singles
    if (locationIds.length === 1) {
      const locationId = locationIds[0]
      const results = await this.getStats_SingleChunk({locationIds: [locationId], fromDate, toDate})
      return results.length ? results[0] : this.newStatsFor(locationId)
    }

    // Multi location
    const stats = await this.getStatsWith({locationIds, fromDate, toDate})

    // Flatten
    const statsMap: Record<string, AccessStatsModel> = {}
    const statsForLocations = stats.reduce((result, item) => {
      statsMap[item.locationId] = item
      return result
    })

    // Add up
    const sum: AccessStatsModel = {
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
    }
    for (const locationId of locationIds) {
      // Get proper one
      const current =
        locationId in statsForLocations
          ? statsForLocations[locationId]
          : await this.newStatsFor(locationId)

      // Add up
      sum.peopleOnPremises += current.peopleOnPremises
      sum.accessDenied += current.accessDenied
      sum.exposures += current.exposures
      sum.pendingPassports += current.pendingPassports
      sum.proceedPassports += current.proceedPassports
      sum.cautionPassports += current.cautionPassports
      sum.stopPassports += current.stopPassports
    }

    return sum
  }

  private async getStatsWith({
    locationIds,
    toDate,
    fromDate,
  }: AccessStatsFilter): Promise<AccessStatsModel[]> {
    return await Promise.all(
      _.chunk([...locationIds], 10).map((chunk) =>
        this.getStats_SingleChunk({locationIds: chunk, fromDate, toDate}),
      ),
    ).then((results) => flattern(results as AccessStatsModel[][]))
  }

  private async getStats_SingleChunk({
    locationIds,
    toDate,
    fromDate,
  }: AccessStatsFilter): Promise<AccessStatsModel[]> {
    let query = this.dataStore.firestoreORM
      .collection<AccessStatsModel>({path: this.accessStatsRepository.rootPath})
      .where('locationId', 'in', locationIds)

    if (fromDate) {
      query = query.where('createdAt', '>=', fromDate)
    }

    if (toDate) {
      query = query.where('createdAt', '<=', toDate)
    }

    return await query.fetch()
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

  private sumOfStats(stats: AccessStatsModel[]): AccessStatsModel {
    return stats.reduce((sum, current) => {
      sum.peopleOnPremises += current.peopleOnPremises
      sum.accessDenied += current.accessDenied
      sum.exposures += current.exposures
      sum.pendingPassports += current.pendingPassports
      sum.proceedPassports += current.proceedPassports
      sum.cautionPassports += current.cautionPassports
      sum.stopPassports += current.stopPassports
      return sum
    })
  }
}
