// Common
import {now} from '../../../common/src/utils/times'
import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'

// Models
import {UserOrganization} from '../../../enterprise/src/models/user'
import {CartRequest, CardItemDBModel, UserCart} from '../models/cart'

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

  addBatch(userId: string, items: Omit<CardItemDBModel, 'id'>[]) {
    const cartCollection = this.datastore.firestoreORM.collection({path: this.rootPath})
    const batch = this.datastore.firestoreAdmin.firestore().batch()

    const userDoc = cartCollection.docRef(userId)
    const userItems = userDoc.collection('items')

    // Add all items
    items.forEach((item) => {
      const newItem = userItems.doc()
      batch.set(newItem, item)
    })

    // Update cart time
    batch.set(userDoc, {updateOn: now()})

    batch.commit()
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
