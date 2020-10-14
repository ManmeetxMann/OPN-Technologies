import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {UserOrganization} from '../models/user'

export class UserOrganizationRepository extends DataModel<UserOrganization> {
  public rootPath = 'user-organizations'
  readonly zeroSet = []
  constructor(dataStore: DataStore) {
    super(dataStore)
  }
}
