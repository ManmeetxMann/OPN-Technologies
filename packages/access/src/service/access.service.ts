import {IdentifiersModel} from '../../../common/src/data/identifiers'
import {UserDependant, UserDependantModel} from '../../../common/src/data/user'
import DataStore from '../../../common/src/data/datastore'
import {AccessModel, AccessRepository} from '../repository/access.repository'
import {Access} from '../models/access'
import {firestore} from 'firebase-admin'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {AccessStatsModel, AccessStatsRepository} from '../repository/access-stats.repository'
import AccessListener from '../effects/addToAttendance'
import moment from 'moment'
import {serverTimestamp} from '../../../common/src/utils/times'
import * as _ from 'lodash'
import {serverTimestamp} from '../../../common/src/utils/times'

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

  create(
    statusToken: string,
    locationId: string,
    userId: string,
    includesGuardian: boolean,
    dependantIds: string[],
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
        }),
      )
      .then(({id, createdAt, ...access}) => ({
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
      if (!!access.dependants[id].enteredAt || !!access.dependants[id].enteredAt) {
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

  handleExit(
    access: AccessModel,
    includesGuardian: boolean,
    dependantIds: string[],
  ): Promise<AccessWithDependantNames> {
    if (!includesGuardian && !dependantIds.length) {
      throw new BadRequestException('Must specify at least one user')
    }
    if (includesGuardian) {
      if (!!access.exitAt) {
        throw new BadRequestException('Token already used to exit')
      }
      if (!access.includesGuardian) {
        throw new Error('Token does not apply to guardian')
      }
    }
    if (dependantIds.some((id) => !access.dependants[id])) {
      throw new BadRequestException('Token does not include all dependants')
    }
    if (dependantIds.some((id) => !!access.dependants[id].exitAt)) {
      throw new BadRequestException('Token already used to exit')
    }
    const newDependants = {}
    for (const id in access.dependants) {
      if (dependantIds.includes(id)) {
        newDependants[id] = {
          ...access.dependants[id],
          exitAt: serverTimestamp(),
        }
      } else {
        newDependants[id] = access.dependants[id]
      }
    }

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
        .then((dependants) => {
          this.accessListener.addExit(savedAccess)
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

  getTodayStatsForLocation(locationId: string): Promise<AccessStatsModel> {
    const today = moment().startOf('day').toDate()
    return this.dataStore.firestoreORM
      .collection<AccessStatsModel>({path: this.accessStatsRepository.rootPath})
      .where('locationId', '==', locationId)
      .where('createdAt', '>=', today)
      .fetch()
      .then((results) =>
        results.length === 0
          ? this.accessStatsRepository.add({
              locationId,
              peopleOnPremises: 0,
              accessDenied: 0,
              createdAt: serverTimestamp(),
            } as AccessStatsModel)
          : results[0],
      )
  }

  incrementPeopleOnPremises(locationId: string, count = 1): Promise<AccessStatsModel> {
    return this.getTodayStatsForLocation(locationId).then((stats) =>
      this.accessStatsRepository.increment(stats.id, 'peopleOnPremises', count),
    )
  }

  decreasePeopleOnPremises(locationId: string, count = 1): Promise<AccessStatsModel> {
    return this.getTodayStatsForLocation(locationId).then((stats) =>
      stats.peopleOnPremises > 0
        ? this.accessStatsRepository.increment(stats.id, 'peopleOnPremises', -count)
        : stats,
    )
  }

  incrementAccessDenied(locationId: string, count = 1): Promise<AccessStatsModel> {
    return this.getTodayStatsForLocation(locationId).then((stats) =>
      this.accessStatsRepository.increment(stats.id, 'accessDenied', count),
    )
  }
}
