import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'
import {Coupon} from '../models/coupons'

export class CouponRepository extends DataModel<Coupon> {
  public rootPath = 'coupons'
  readonly zeroSet = []

  constructor(dataStore: DataStore) {
    super(dataStore)
  }

  async getByCouponCode(couponCode: string): Promise<Coupon> {
    const result = await this.findWhereEqual('couponCode', couponCode)
    if (result.length > 1) {
      console.log(`getByCouponCode: More than 1 result for the couponCode ${couponCode}`)
    }
    return result[0]
  }

  public async save(coupon: Omit<Coupon, 'id'>): Promise<void> {
    await this.add(coupon)
  }
}
