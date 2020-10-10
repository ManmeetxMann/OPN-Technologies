import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {UserDependency} from '../models/user'

export class UserDependencyRepository extends DataModel<UserDependency> {
  public rootPath = 'user-dependencies'
  readonly zeroSet = []
  constructor(dataStore: DataStore) {
    super(dataStore)
  }
}
