import {IdentifiersModel} from '../../../common/src/data/identifiers'
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

  handleEnter(access: AccessModel): Promise<Access> {
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
    return this.accessRepository.update(newAccess).then((saved) =>
      Promise.all([
        this.incrementPeopleOnPremises(access.locationId, count),
        // TODO: maybe we don't need to wait for this to resolve
        this.accessListener.addEntry(saved),
      ]).then(() => saved),
    )
  }

  handleExit(
    access: AccessModel,
    includesGuardian: boolean,
    dependantIds: string[],
  ): Promise<Access> {
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

    return this.accessRepository
      .update({
        ...access,
        exitAt: serverTimestamp(),
      })
      .then((saved) =>
        Promise.all([
          this.decreasePeopleOnPremises(access.locationId, count),
          // TODO: maybe we don't need to wait for this to resolve
          this.accessListener.addExit(saved),
        ]).then(() => saved),
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
