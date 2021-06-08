import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {TestTypes} from '../models/appointment'
import {InconclusiveCoupon} from '../models/coupons'

export class InconclusiveCouponRepository extends DataModel<InconclusiveCoupon> {
  public rootPath = 'inconclusive-coupons'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  async getCouponByTestType(testType: TestTypes): Promise<InconclusiveCoupon> {
    const [result] = await this.findWhereEqual('testType', testType)
    return result
  }
}
