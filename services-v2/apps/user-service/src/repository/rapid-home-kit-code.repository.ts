import DataModel from '@opn-common-v1/data/datamodel.base'
import DataStore from '@opn-common-v1/data/datastore'
import {firestore} from 'firebase-admin'
import {Auditable} from '@opn-common-v1/types/auditable'

export type RapidHomeKitCode = Auditable & {
  id: string
  code: string
  prindted: boolean
  printedOn: firestore.Timestamp
  userIds?: UserIds[]
  filterUserIds: string[]
  usedForUserIds : string[]
}

export type UserIds = {
  addedDate: firestore.Timestamp
  userId: string
}

export class RapidHomeKitCodeRepository extends DataModel<RapidHomeKitCode> {
  public rootPath = 'rapid-home-kit-codes'
  readonly zeroSet = []
  constructor(dataStore: DataStore) {
    super(dataStore)
  }
}
