import {Config} from '../../../common/src/utils/config'
import DataStore from '../../../common/src/data/datastore'

import {AcuityRepository} from '../respository/acuity.repository'
import {CouponRepository} from '../respository/coupon.repository'
import {InconclusiveCouponRepository} from '../respository/inconclusive-coupons.repository'
import {CouponEnum} from '../models/coupons'
import {TestTypes} from '../models/appointment'

export class CouponService {
  private dataStore = new DataStore()
  private couponRepository = new CouponRepository(this.dataStore)
  private inconclusiveCouponRepository = new InconclusiveCouponRepository(this.dataStore)
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

  async createCoupon(
    email: string,
    couponIdType: CouponEnum,
    testType: TestTypes = TestTypes.PCR,
  ): Promise<string> {
    const couponID =
      couponIdType === CouponEnum.forResample
        ? await this.getInconclusiveCouponId(testType)
        : Config.getInt('ACUITY_COUPON_ID_FOR_RAPIDHOME')

    return this.acuityRepository.createCouponCode(couponID, email)
  }

  /**
   * Get coupon ID for inconclusive results
   */
  async getInconclusiveCouponId(testType: TestTypes): Promise<number> {
    const couponDocument = await this.inconclusiveCouponRepository.getCouponByTestType(testType)
    return couponDocument.couponId
  }
}
