import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {UserAddress} from '../models/user-address'

export class UserAddressRepository extends DataModel<UserAddress> {
  public rootPath = 'user-addresses'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  create(userAddress: Omit<UserAddress, 'id'>): Promise<UserAddress> {
    return this.add(userAddress)
  }
}
