import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {NfcTag} from '../models/nfcTag'

export class NfcTagRepository extends DataModel<NfcTag> {
  public rootPath = 'nfc-tags'
  readonly zeroSet = []
  constructor(dataStore: DataStore) {
    super(dataStore)
  }
}
