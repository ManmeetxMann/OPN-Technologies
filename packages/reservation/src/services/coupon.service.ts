import {Config} from '../../../common/src/utils/config'
import DataStore from '../../../common/src/data/datastore'

import {AcuityRepository} from '../respository/acuity.repository'
import {CouponRepository} from '../respository/coupon.repository'

export class CouponService {
  private couponRepository = new CouponRepository(new DataStore())
  private acuityRepository = new AcuityRepository()

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
