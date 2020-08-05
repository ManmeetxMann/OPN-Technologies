import {HasId, WhereFilterOp} from '@firestore-simple/admin/dist/types'
import {firestore} from 'firebase-admin'

import DataModel from './datamodel.base'
import DataStore from './datastore'

type QueryCondition = [string, WhereFilterOp, unknown]

type RecordWithPath<G> = {
  path: string[]
  value: G
}

abstract class CollectionGroupModel<T extends HasId, G> extends DataModel<T> {
  abstract readonly groupId: string
  // shadow of the parent class' private ds
  private store: DataStore
  constructor(store: DataStore) {
    super(store)
    this.store = store
  }

  private digest(doc: firestore.QueryDocumentSnapshot<G>): {path: string[]; value: G} {
    return {
      path: doc.ref.path.split('/'),
      value: doc.data(),
    }
  }

  private getQuery(): firestore.Query {
    return this.store.firestoreAdmin.firestore().collectionGroup(this.groupId)
  }

  async groupGet(queryConditions: QueryCondition[]): Promise<RecordWithPath<G>[]> {
    let result
    const query = this.getQuery()
    if (!queryConditions.length) {
      result = query.get()
    } else {
      let conditional: firestore.Query<firestore.DocumentData>
      for (let i = 0; i < queryConditions.length; i += 1) {
        if (i) {
          conditional = conditional.where(...queryConditions[i])
        } else {
          conditional = query.where(...queryConditions[i])
        }
      }
      result = conditional.get()
    }
    return (await result).docs.map(this.digest)
  }
}

export default CollectionGroupModel
