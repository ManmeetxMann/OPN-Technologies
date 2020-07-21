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

  create(statusToken: string, locationId: string): Promise<Access> {
    return this.identifier
      .getUniqueValue('access')
      .then((token) =>
        this.accessRepository.add({
          token,
          locationId,
          statusToken,
          createdAt: firestore.FieldValue.serverTimestamp(),
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

    return this.accessRepository
      .update({
        ...access,
        enteredAt: firestore.FieldValue.serverTimestamp(),
      })
      .then((saved) => this.incrementPeopleOnPremises(access.locationId).then(() => saved))
  }

  handleExit(access: AccessModel): Promise<Access> {
    if (!!access.exitAt) {
      throw new BadRequestException('Token already used to exit')
    }

    return this.accessRepository
      .update({
        ...access,
        exitAt: firestore.FieldValue.serverTimestamp(),
      })
      .then((saved) => this.decreasePeopleOnPremises(access.locationId).then(() => saved))
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

  incrementPeopleOnPremises(locationId: string): Promise<AccessStatsModel> {
    return this.getTodayStatsForLocation(locationId).then((stats) =>
      this.accessStatsRepository.increment(stats.id, 'peopleOnPremises', 1),
    )
  }

  decreasePeopleOnPremises(locationId: string): Promise<AccessStatsModel> {
    return this.getTodayStatsForLocation(locationId).then((stats) =>
      stats.peopleOnPremises > 0
        ? this.accessStatsRepository.increment(stats.id, 'peopleOnPremises', -1)
        : stats,
    )
  }

  incrementAccessDenied(locationId: string): Promise<AccessStatsModel> {
    return this.getTodayStatsForLocation(locationId).then((stats) =>
      this.accessStatsRepository.increment(stats.id, 'accessDenied', 1),
    )
  }
}
