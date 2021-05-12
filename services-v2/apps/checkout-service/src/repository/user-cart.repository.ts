// Libs
import {Injectable} from '@nestjs/common'

// V1 common
import {now} from '@opn-common-v1/utils/times'
import DataModel from '@opn-common-v1/data/datamodel.base'
import DataStore from '@opn-common-v1/data/datastore'

// Models
import {CardItemDBModel, UserCartDBModel} from '../model/cart'

/**
 * TODO:
 * 1. Schema validation
 */
@Injectable()
export class UserCartRepository extends DataModel<UserCartDBModel> {
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
    items.forEach(item => {
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

  async deleteCollection(): Promise<void> {
    const cartCollection = this.datastore.firestoreORM.collection({path: this.rootPath})
    const batch = this.datastore.firestoreAdmin.firestore().batch()

    const documents = await cartCollection.collectionRef.listDocuments()
    documents.forEach(document => {
      batch.delete(document)
    })

    batch.commit()
  }
}
