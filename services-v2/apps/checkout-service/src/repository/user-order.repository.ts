// Libs
import {Injectable} from '@nestjs/common'

// V1 common
import DataModel from '@opn-common-v1/data/datamodel.base'
import DataStore from '@opn-common-v1/data/datastore'

// Models
import {OrderDBModel} from '../model/cart'

@Injectable()
export class UserOrderRepository extends DataModel<OrderDBModel> {
  public rootPath = 'user-order'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }
}
