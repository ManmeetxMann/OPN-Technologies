import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {UserGroup} from '../models/user'

export class UserGroupRepository extends DataModel<UserGroup> {
  public rootPath = 'user-groups'
  readonly zeroSet = []
  constructor(dataStore: DataStore) {
    super(dataStore)
  }
}
