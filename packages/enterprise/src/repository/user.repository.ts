import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {AuthUser} from "../../../common/src/data/user";

export class UserRepository extends DataModel<AuthUser> {
  public rootPath = 'users'
  readonly zeroSet = []
  constructor(dataStore: DataStore) {
    super(dataStore)
  }
}
