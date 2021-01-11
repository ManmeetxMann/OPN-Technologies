import {Config} from '../../../common/src/utils/config'
import DataStore from '../../../common/src/data/datastore'

import {Coupon} from '../models/coupons'
import {AcuityRepository} from '../respository/acuity.repository'
import {CouponRepository} from '../respository/coupon.repository'

export class CouponService {
  private couponRepository = new CouponRepository(new DataStore())
  private acuityRepository = new AcuityRepository()

  async getByCouponCode(couponCode: string): Promise<Coupon> {
    const result = await this.couponRepository.findWhereEqual('couponCode', couponCode)
    if (result.length > 1) {
      console.log(`getByCouponCode: More than 1 result for the couponCode ${couponCode}`)
    }
    return result[0]
  }

  async saveCoupon(couponCode: string, organizationId: string, lastBarcode: string): Promise<void> {
    await this.couponRepository.add({
      couponCode,
      organizationId,
      lastBarcode,
    })
  }

  async createCoupon(email: string): Promise<string> {
    const couponID = Config.getInt('ACUITY_COUPON_ID')
    return this.acuityRepository.createCouponCode(couponID, email)
  }
}
