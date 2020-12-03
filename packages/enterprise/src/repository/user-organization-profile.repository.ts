import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {UserOrganizationProfile} from '../models/user'

export class UserOrganizationProfileRepository extends DataModel<UserOrganizationProfile> {
  public rootPath = 'user-organization-profile'
  readonly zeroSet = []
  constructor(dataStore: DataStore) {
    super(dataStore)
  }
}
