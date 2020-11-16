import {WhereFilterOp} from '@firestore-simple/admin/dist/types'
import {firestore} from 'firebase-admin'

import DataStore from './datastore'

type QueryCondition = [string | firestore.FieldPath, WhereFilterOp, unknown]

type RecordWithPath<G> = {
  path: string[]
  value: G
}

function digestGroupResult<G>(doc: firestore.QueryDocumentSnapshot<G>): {path: string[]; value: G} {
  return {
    path: doc.ref.path.split('/'),
    value: doc.data(),
  }
}

// an extension of a normal datamodel which can also access a collectionGroup
abstract class CollectionGroupModel<G> {
  abstract readonly groupId: string
  // shadow of the parent class' private ds
  private store: DataStore
  constructor(store: DataStore) {
    this.store = store
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
      const conditional = queryConditions.reduce(
        (queryBuilder: firestore.Query<firestore.DocumentData>, condition: QueryCondition) =>
          queryBuilder.where(...condition),
        query,
      )
      result = conditional.get()
    }
    return (await result).docs.map(digestGroupResult)
  }

  async groupGetWhereEqual(
    key: string,
    value: string | firestore.FieldValue,
  ): Promise<RecordWithPath<G>> {
    // can't query actual ids in a collectionGroup
    const items = await this.groupGet([[key, '==', value]])
    if (items.length == 0) {
      return null
    }
    if (items.length > 1) {
      console.warn(`multiple ${this.groupId} with ${key} == ${value}`)
      console.warn(items)
    }
    return items[0]
  }
}

export default CollectionGroupModel
