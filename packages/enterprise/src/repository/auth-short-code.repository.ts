import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {AuthShortCode} from '../models/auth'

export class AuthShortCodeRepository extends DataModel<AuthShortCode> {
  public rootPath = 'auth-short-codes'
  readonly zeroSet = []
  constructor(dataStore: DataStore) {
    super(dataStore)
  }
}
