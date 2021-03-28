import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {UserAddress} from '../models/user-address'
import {DataModelFieldMapOperatorType} from '../../../common/src/data/datamodel.base'

export class UserAddressRepository extends DataModel<UserAddress> {
  public rootPath = 'user-addresses'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  create(userAddress: Omit<UserAddress, 'id'>): Promise<UserAddress> {
    return this.add(userAddress)
  }

  async getUserAddress(userId: string, address: string): Promise<UserAddress[]> {
    return this.findWhereEqualInMap([
      {
        map: '/',
        key: 'userId',
        operator: DataModelFieldMapOperatorType.Equals,
        value: userId,
      },
      {
        map: '/',
        key: 'address',
        operator: DataModelFieldMapOperatorType.Equals,
        value: address,
      },
    ])
  }
}
