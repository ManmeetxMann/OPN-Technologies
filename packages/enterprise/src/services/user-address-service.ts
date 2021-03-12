import DataStore from '../../../common/src/data/datastore'
import {UserAddress} from '../models/user-address'
import {UserAddressRepository} from '../repository/user-address.repository'

export class UserAddressService {
  private dataStore = new DataStore()
  private userAddressRepository = new UserAddressRepository(this.dataStore)

  create(userAddress: Omit<UserAddress, 'id'>): Promise<UserAddress> {
    return this.userAddressRepository.create(userAddress)
  }
}
