import {IdentifiersModel} from '../../../common/src/data/identifiers'
import DataStore from '../../../common/src/data/datastore'
import {AccessModel, AccessRepository} from '../repository/access.repository'
import {Access} from '../models/access'
import {firestore} from 'firebase-admin'
import {ResourceNotFoundException} from '../../../common/src/exceptions/resource-not-found-exception'
import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {AccessStatsModel, AccessStatsRepository} from '../repository/access-stats.repository'
import moment from 'moment'

export class AccessService {
  private dataStore = new DataStore()
  private identifier = new IdentifiersModel(this.dataStore)
  private accessRepository = new AccessRepository(this.dataStore)
  private accessStatsRepository = new AccessStatsRepository(this.dataStore)

  create(
    statusToken: string,
    locationId: string,
    userId: string,
    includesGuardian: boolean,
    dependantIds: string[],
  ): Promise<Access> {
    const dependants = dependantIds.map((id) => ({
      id,
    }))
    return this.identifier
      .getUniqueValue('access')
      .then((token) =>
        this.accessRepository.add({
          token,
          locationId,
          statusToken,
          createdAt: firestore.FieldValue.serverTimestamp(),
          userId,
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
    if (access.dependants.some((dependant) => !!dependant.enteredAt || !!dependant.exitAt)) {
      throw new BadRequestException('Token already used to enter or exit')
    }
    const dependants = access.dependants.map((dependant) => ({
      ...dependant,
      enteredAt: firestore.FieldValue.serverTimestamp(),
    }))
    const count = dependants.length + (access.includesGuardian ? 1 : 0)
    return this.accessRepository
      .update({
        ...access,
        enteredAt: firestore.FieldValue.serverTimestamp(),
        dependants,
      })
      .then((saved) => this.incrementPeopleOnPremises(access.locationId, count).then(() => saved))
  }

  handleExit(
    access: AccessModel,
    includesGuardian: boolean,
    dependantIds: string[],
  ): Promise<Access> {
    if (includesGuardian) {
      if (!!access.exitAt) {
        throw new BadRequestException('Token already used to exit')
      }
      if (!access.includesGuardian) {
        throw new Error('Token does not apply to guardian')
      }
    }
    if (dependantIds.length) {
      if (access.dependants.some((dep) => dependantIds.includes(dep.id) && !!dep.exitAt)) {
        throw new BadRequestException('Token already used to exit')
      }
      const validIds = access.dependants.map(({id}) => id)
      if (dependantIds.some((depId) => !validIds.includes(depId))) {
        throw new BadRequestException('Token does not include all dependants')
      }
    }
    const newAccess = {
      ...access,
      dependants: access.dependants.map((dep) => ({...dep})),
    }
    if (includesGuardian) {
      // @ts-ignore we are converting to a Storable
      newAccess.exitAt = firestore.FieldValue.serverTimestamp()
    }
    if (dependantIds.length) {
      // @ts-ignore we are converting to a Storable
      newAccess.dependants.forEach((dep) => (dep.exitAt = firestore.FieldValue.serverTimestamp()))
    }
    const count = dependantIds.length + (includesGuardian ? 1 : 0)

    return this.accessRepository
      .update(newAccess)
      .then((saved) => this.decreasePeopleOnPremises(access.locationId, count).then(() => saved))
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
              createdAt: firestore.FieldValue.serverTimestamp(),
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
