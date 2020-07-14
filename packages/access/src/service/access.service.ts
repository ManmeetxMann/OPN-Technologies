import {IdentifiersModel} from '../../../common/src/data/identifiers'
import DataStore from '../../../common/src/data/datastore'
import {AccessRepository} from '../repository/access.repository'
import {Access} from '../models/access'
import {firestore} from 'firebase-admin'

export class AccessService {
  private dataStore = new DataStore()
  private identifier = new IdentifiersModel(this.dataStore)
  accessRepository = new AccessRepository(this.dataStore)

  create(): Promise<Access> {
    return this.identifier
      .getUniqueValue('access')
      .then((token) =>
        this.accessRepository.add({
          token,
          createdAt: firestore.FieldValue.serverTimestamp(),
        }),
      )
      .then(({token, createdAt}) => ({
        token,
        // @ts-ignore
        createdAt: new firestore.Timestamp(createdAt.seconds, createdAt.nanoseconds)
          .toDate()
          .toISOString(),
      }))
  }
}
