import {forwardRef, Inject, Injectable} from '@nestjs/common'
import {LogWarning} from '@opn-services/common/utils/logging'
import {CartEvent, CartFunctions} from '@opn-services/common/types/activity-logs'
import {CartResponseDto} from '@opn-services/checkout/dto'
import {UserCardService} from '@opn-services/checkout/service'
import {CardItemDBModel} from '@opn-reservation-v1/models/cart'
import {
  UserCartItemRepository,
  UserCartRepository,
} from '@opn-services/checkout/repository/user-cart.repository'
import {AcuityErrorValues} from '@opn-reservation-v1/models/acuity'
import {CouponErrorsEnum} from '@opn-services/checkout/model'
import {CouponCheckResponse, DiscountTypes} from '@opn-reservation-v1/models/coupons'
import DataStore from '@opn-common-v1/data/datastore'
import {AcuityRepository} from '@opn-reservation-v1/respository/acuity.repository'

@Injectable()
export class UserCardDiscountService {
  private dataStore = new DataStore()
  private acuityRepository = new AcuityRepository()
  private userCartRepository = new UserCartRepository(this.dataStore)

  constructor(
    @Inject(forwardRef(() => UserCardService))
    private userCardService: UserCardService,
  ) {}

  async discount(coupon: string, userId: string, organizationId: string): Promise<CartResponseDto> {
    const userOrgId = `${userId}_${organizationId}`
    const cardItems = await this.userCardService.fetchUserAllCartItem(userId, organizationId)
    const discountedCartItems = await Promise.all(
      cardItems.map(cartItem => {
        return this.discountSingleItem({userId, organizationId, coupon, cartItem})
      }),
    )
    const cartItems = discountedCartItems.map(cartDB => ({
      cartItemId: cartDB.cartItemId,
      label: cartDB.appointmentType.name,
      subLabel: cartDB.appointment.calendarName,
      patientName: `${cartDB.patient.firstName} ${cartDB.patient.lastName}`,
      date: new Date(cartDB.appointment.time).toISOString(),
      price: parseFloat(cartDB.appointmentType.price),
      userId: cartDB.patient.userId,
      discountedPrice: this.countDiscount(
        parseFloat(cartDB.appointmentType.price),
        cartDB.discountData?.discountType,
        cartDB.discountData?.discountAmount,
      ),
      discountedError: cartDB.error,
    }))

    await this.userCartRepository.addOrUpdateCouponName(userOrgId, coupon)

    return {
      cartItems: cartItems,
      paymentSummary: this.userCardService.buildPaymentSummary(cartItems),
      cart: {
        couponCode: coupon,
      },
    }
  }

  async discountSingleItem(data: {
    userId: string
    organizationId: string
    coupon: string
    cartItem: Omit<CardItemDBModel, 'id'>
  }): Promise<CardItemDBModel> {
    const {userId, organizationId, coupon, cartItem} = data
    const userOrgId = `${userId}_${organizationId}`
    const userCartItemRepository = new UserCartItemRepository(this.dataStore, userOrgId)
    let discount: CouponCheckResponse
    let error
    try {
      discount = await this.acuityRepository.checkCoupon(
        coupon,
        cartItem.appointment.appointmentTypeId,
      )
    } catch (e) {
      const [acuityError] = Object.values(AcuityErrorValues).filter(
        acuityError => acuityError === e.message,
      )

      LogWarning(CartFunctions.discountSingleItem, CartEvent.checkCoupon, {
        error: acuityError,
        rawError: e,
      })

      error = CouponErrorsEnum.invalid_coupon_code
    }
    if (discount?.discountAmount <= 0) {
      error = CouponErrorsEnum.exceed_count
    }
    const [cartItemDataDb] = await userCartItemRepository.findWhereEqual(
      'cartItemId',
      cartItem.cartItemId,
    )

    if (!error) {
      return userCartItemRepository.updateProperties(cartItemDataDb.id, {
        appointmentType: {
          ...cartItem.appointmentType,
        },
        discountData: {
          discountType: discount.discountType,
          discountAmount: discount.discountAmount,
          name: discount.certificate,
          couponId: discount.couponID,
          expiration: discount.expiration,
        },
      })
    }
    return {...cartItemDataDb, error}
  }

  countDiscount(initialPrice: number, discountType: DiscountTypes, discountAmount: number): number {
    return discountType === DiscountTypes.percentage
      ? initialPrice - (initialPrice * discountAmount) / 100
      : initialPrice - discountAmount
  }
}
