import {Config} from '../../../common/src/utils/config'
import DataStore from '../../../common/src/data/datastore'

import {AcuityRepository} from '../respository/acuity.repository'
import {CouponRepository} from '../respository/coupon.repository'
import {CouponEnum} from '../models/coupons'

export class CouponService {
  private couponRepository = new CouponRepository(new DataStore())
  private acuityRepository = new AcuityRepository()

  async saveCoupon(
    couponCode: string,
    organizationId: string = null,
    lastBarcode: string = null,
  ): Promise<void> {
    await this.couponRepository.add({
      couponCode,
      organizationId,
      lastBarcode,
    })
  }

  async createCoupon(email: string, couponIdType: CouponEnum): Promise<string> {
    const couponID =
      couponIdType === CouponEnum.forResample
        ? Config.getInt('ACUITY_COUPON_ID_FOR_RESAMPLE')
        : Config.getInt('ACUITY_COUPON_ID_FOR_RAPIDHOME')
    return this.acuityRepository.createCouponCode(couponID, email)
  }
}
