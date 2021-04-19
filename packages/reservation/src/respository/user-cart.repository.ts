// Common
import {now} from '../../../common/src/utils/times'
import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'

// Models
import {CardItemDBModel, UserCart} from '../models/cart'

/**
 * TODO:
 * 1. Schema validation
 */
export class UserCartRepository extends DataModel<UserCart> {
  public rootPath = 'user-cart'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  async addBatch(userOrgId: string, items: Omit<CardItemDBModel, 'id'>[]): Promise<unknown> {
    const cartCollection = this.datastore.firestoreORM.collection({path: this.rootPath})
    const batch = this.datastore.firestoreAdmin.firestore().batch()

    const userDoc = cartCollection.docRef(userOrgId)
    const userItems = userDoc.collection('items')

    // Add all items
    items.forEach((item) => {
      const newItem = userItems.doc()
      batch.set(newItem, item)
    })

    // Update cart time
    batch.set(userDoc, {updateOn: now()})

    return batch.commit()
  }
}

export class UserCartItemRepository extends DataModel<CardItemDBModel> {
  public rootPath = 'user-cart'
  readonly zeroSet = []

  constructor(dataStore: DataStore, userOrgId: string) {
    super(dataStore)
    this.rootPath = `user-cart/${userOrgId}/items`
  }
}
