import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {Coupon} from '../models/coupons'

export class CouponRepository extends DataModel<Coupon> {
  public rootPath = 'coupons'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  public async save(coupon: Omit<Coupon, 'id'>): Promise<void> {
    await this.add(coupon)
  }
}
