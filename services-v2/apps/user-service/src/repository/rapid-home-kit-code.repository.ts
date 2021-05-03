import DataModel from '@opn-common-v1/data/datamodel.base'
import DataStore from '@opn-common-v1/data/datastore'
import {firestore} from 'firebase-admin'

export type RapidHomeKitCode = {
  id: string
  code: string
  prindted: boolean
  printedOn: firestore.Timestamp
}

export class RapidHomeKitCodeRepository extends DataModel<RapidHomeKitCode> {
  public rootPath = 'rapid-home-kit-codes'
  readonly zeroSet = []
  constructor(dataStore: DataStore) {
    super(dataStore)
  }
}
