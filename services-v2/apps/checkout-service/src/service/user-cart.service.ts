import {Injectable} from '@nestjs/common'

// Common
import DataStore from '@opn-common-v1/data/datastore'
import {AcuityRepository} from '@opn-reservation-v1/respository/acuity.repository'
import {decodeAvailableTimeId} from '@opn-reservation-v1/utils/base64-converter'
import {UserRepository} from '@opn-enterprise-v1/repository/user.repository'
import {BadRequestException, ResourceNotFoundException} from '@opn-services/common/exception'

// Libs
import * as moment from 'moment'
import {Stripe} from 'stripe'
import * as _ from 'lodash'
import {v4 as uuidv4} from 'uuid'

// Repositories
import {UserCartItemRepository, UserCartRepository} from '../repository/user-cart.repository'
import {UserOrderRepository} from '../repository/user-order.repository'
import {AcuityTypesRepository} from '../repository/acuity-types.repository'

// Models
import {CardItemDBModel, CartItemStatus, CouponErrorsEnum} from '../model/cart'
import {
  CartAddDto,
  CartItemDto,
  CartItemResponse,
  CartResponseDto,
  CartSummaryDto,
  CartUpdateRequestDto,
  CartValidationItemDto,
  PaymentAuthorizationCartDto,
} from '../dto'
import {firestoreTimeStampToUTC} from '@opn-reservation-v1/utils/datetime.helper'
import {OpnConfigService} from '@opn-services/common/services'

import {CartEvent, CartFunctions} from '@opn-services/common/types/activity-logs'
import {LogError} from '@opn-services/common/utils/logging'
import {DiscountTypes} from '@opn-reservation-v1/models/coupons'

import {JoiValidator} from '@opn-services/common/utils/joi-validator'
import {acuityTypesSchema, cartItemSchema} from '@opn-services/common/schemas'
import {AcuityErrorValues} from '@opn-reservation-v1/models/acuity'

/**
 * Stores cart items under ${userId}_${organizationId} key in user-cart collection
 */
@Injectable()
export class UserCardService {
  private dataStore = new DataStore()
  private acuityRepository = new AcuityRepository()
  private userRepository = new UserRepository(this.dataStore)
  private userCartRepository = new UserCartRepository(this.dataStore)
  private userOrderRepository = new UserOrderRepository(this.dataStore)
  private acuityTypesRepository = new AcuityTypesRepository(this.dataStore)

  private hstTax = 0.13
  public timeSlotNotAvailMsg = 'Time Slot Unavailable: Book Another Slot'
  private cartChunkSize = 20

  constructor(private configService: OpnConfigService) {}

  private buildPaymentSummary(cartItems: CartItemDto[]): CartSummaryDto[] {
    const round = num => Math.round(num * 100) / 100
    const discountedSum = cartItems.reduce(
      (sum, item) => sum + (item.discountedPrice || item.price || 0),
      0,
    )
    const tax = round(discountedSum * this.hstTax)
    const total = round(discountedSum + tax)

    if (total == 0) {
      return []
    }

    const paymentSummary = [
      {
        uid: 'subTotal',
        label: 'SUBTOTAL',
        amount: discountedSum,
        currency: 'CAD',
      },
      {
        uid: 'tax',
        label: `TAX (HST -${this.hstTax * 100}%)`,
        amount: tax,
        currency: 'CAD',
      },
      {
        uid: 'total',
        label: 'Your Total',
        amount: total,
        currency: 'CAD',
      },
    ]

    return paymentSummary
  }

  private async fetchUserAllCartItem(
    userId: string,
    organizationId: string,
  ): Promise<CardItemDBModel[]> {
    const userOrgId = `${userId}_${organizationId}`
    const userCartItemRepository = new UserCartItemRepository(this.dataStore, userOrgId)
    const cartDBItems = await userCartItemRepository.fetchAll()
    return cartDBItems
  }

  private async validateCart(cartDdItems: CardItemDBModel[]): Promise<PaymentAuthorizationCartDto> {
    // For all items get unique variants of acuity queries
    const acuitySlots = []
    for (const cardDbItem of cartDdItems) {
      const {appointment} = cardDbItem

      const hasVariant = acuitySlots.some(
        acuitySlot =>
          appointment.appointmentTypeId === acuitySlot.appointmentTypeId &&
          appointment.date === acuitySlot.date &&
          appointment.calendarId === acuitySlot.calendarId &&
          appointment.calendarTimezone === acuitySlot.calendarTimezone,
      )
      if (!hasVariant) {
        acuitySlots.push({
          appointmentTypeId: appointment.appointmentTypeId,
          date: appointment.date,
          calendarId: appointment.calendarId,
          calendarTimezone: appointment.calendarTimezone,
        })
      }
    }

    // Fetch slotsAvailable for each variant from acuity
    for (const acuitySlot of acuitySlots) {
      const response = await this.acuityRepository.getAvailableSlots(
        acuitySlot.appointmentTypeId,
        acuitySlot.date,
        acuitySlot.calendarId,
        acuitySlot.calendarTimezone,
      )
      acuitySlot.times = response
    }

    // Validate if slot time is available
    let isValid = true
    const invalidItems: CartValidationItemDto[] = []
    for (const cardDbItem of cartDdItems) {
      const {appointment, cartItemId} = cardDbItem
      const acuitySlot = acuitySlots.find(
        acuitySlot =>
          appointment.appointmentTypeId === acuitySlot.appointmentTypeId &&
          appointment.date === acuitySlot.date &&
          appointment.calendarId === acuitySlot.calendarId &&
          appointment.calendarTimezone === acuitySlot.calendarTimezone,
      )
      const time = acuitySlot.times.find(time => time.time === appointment.time)
      if (!time) {
        isValid = false
        invalidItems.push({
          cartItemId,
          message: this.timeSlotNotAvailMsg,
        })
      } else if (time.slotsAvailable-- <= 0) {
        isValid = false
        invalidItems.push({
          cartItemId,
          message: this.timeSlotNotAvailMsg,
        })
      }
    }
    return {items: invalidItems, isValid}
  }

  async cleanupUserCart(): Promise<void> {
    const expirationHours = this.configService.get('CART_EXPIRATION_HOURS')
    let iteration = 1
    let done = false
    while (!done) {
      const userCarts = await this.userCartRepository.fetchAllWithPagination(
        iteration,
        this.cartChunkSize,
      )
      for (const userCart of userCarts) {
        const updatedDateMoment = firestoreTimeStampToUTC(userCart.updateOn).add(
          expirationHours,
          'hours',
        )
        const expirationDateMoment = moment().utc()
        if (expirationDateMoment.isBefore(updatedDateMoment)) {
          await this.userCartRepository.delete(userCart.id)
        }
      }
      done = userCarts.length === 0
      iteration++
    }
  }

  async getCartItemById(cartItemId: string, userOrgId: string): Promise<CartItemResponse> {
    const userCartItemRepository = new UserCartItemRepository(this.dataStore, userOrgId)
    const cartItem = await userCartItemRepository.findWhereEqual('cartItemId', cartItemId)
    const cartItemExist = cartItem[0]

    if (!cartItemExist) {
      throw new ResourceNotFoundException('userCart-item with given id not found')
    }
    return {
      patient: cartItemExist.patient,
      appointment: {
        id: cartItemExist.appointment.slotId,
        ..._.omit(cartItemExist.appointment, 'slotId'),
      },
    }
  }

  async cartItemsCount(userId: string, organizationId: string): Promise<number> {
    const userOrgId = `${userId}_${organizationId}`
    const userCartItemRepository = new UserCartItemRepository(this.dataStore, userOrgId)
    return userCartItemRepository.count()
  }

  async removeCoupons(userId: string, organizationId: string): Promise<CartResponseDto> {
    const userOrgId = `${userId}_${organizationId}`
    const userCartItemRepository = new UserCartItemRepository(this.dataStore, userOrgId)
    const cartItemsData = await userCartItemRepository.fetchAll()

    if (!cartItemsData || !cartItemsData.length) {
      throw new ResourceNotFoundException('userCart-item with given id not found')
    }

    const cartData = await Promise.all(
      cartItemsData.map(async cartItem => {
        const cartItemData = {
          ...cartItem,
          discountData: null,
        }
        return userCartItemRepository.update(cartItemData)
      }),
    )

    const cartItems = cartData.map(cartDB => ({
      cartItemId: cartDB.cartItemId,
      label: cartDB.appointmentType.name,
      subLabel: cartDB.appointment.calendarName,
      patientName: `${cartDB.patient.firstName} ${cartDB.patient.lastName}`,
      date: new Date(cartDB.appointment.time).toISOString(),
      price: parseFloat(cartDB.appointmentType.price),
      userId: cartDB.patient.userId,
      discountedError: cartDB.discountData?.error,
    }))

    const couponCode = cartData.find(cartItem => cartItem?.discountData?.name)
    return {
      cartItems,
      paymentSummary: this.buildPaymentSummary(cartItems),
      cart: {
        couponCode: couponCode?.discountData ? couponCode.discountData.name : null,
      },
    }
  }

  async getUserCart(userId: string, organizationId: string): Promise<CartResponseDto> {
    const cartDBItems = await this.fetchUserAllCartItem(userId, organizationId)
    const cartItems = cartDBItems.map(cartDB => {
      let cartItem = new CartItemDto()

      const discountedPrice = this.countDiscount(
        parseFloat(cartDB.appointmentType.price),
        cartDB.discountData?.discountType,
        cartDB.discountData?.discountAmount,
      )

      cartItem = {
        cartItemId: cartDB.cartItemId,
        label: cartDB.appointmentType.name,
        subLabel: cartDB.appointment.calendarName,
        patientName: `${cartDB.patient.firstName} ${cartDB.patient.lastName}`,
        date: new Date(cartDB.appointment.time).toISOString(),
        price: parseFloat(cartDB.appointmentType.price),
        discountedPrice,
        userId: cartDB.patient.userId,
        discountedError: cartDB.discountData?.error,
      }
      return cartItem
    })

    const couponCode = cartDBItems.find(cartItem => cartItem?.discountData?.name)
    return {
      cartItems,
      paymentSummary: this.buildPaymentSummary(cartItems),
      cart: {
        couponCode: couponCode?.discountData ? couponCode.discountData.name : null,
      },
    }
  }

  async updateUserStripeCustomerId(id: string, stripeCustomerId: string): Promise<void> {
    this.userRepository.updateProperty(id, 'stripeCustomerId', stripeCustomerId)
  }

  async syncAppointmentTypes(): Promise<boolean> {
    const isNumeric = (text: string) => !isNaN(parseFloat(text))
    const appointmentTypes = await this.acuityRepository.getAppointmentTypeList()

    if (!appointmentTypes) {
      throw new BadRequestException('No appointments types fetched')
    }

    // Create update each appointment type id
    const result = []
    for (const appointmentType of appointmentTypes) {
      const id = appointmentType.id.toString()
      const price = appointmentType.price
      const name = appointmentType.name

      // Don't create update if no valid price
      if (!isNumeric(price)) {
        break
      }
      let createUpdateResult = null
      const acuityType = await this.acuityTypesRepository.get(id)
      const acuityTypesValidator = new JoiValidator(acuityTypesSchema)
      const acuityTypes = await acuityTypesValidator.validate({id, price, name})

      if (!acuityType) {
        createUpdateResult = await this.acuityTypesRepository.add(acuityTypes)
      } else {
        createUpdateResult = await this.acuityTypesRepository.update(acuityTypes)
      }

      result.push(createUpdateResult)
    }

    // Success if all are created
    const isSuccess = appointmentTypes.length === result.length

    return isSuccess
  }

  async addItems(userId: string, organizationId: string, items: CartAddDto[]): Promise<void> {
    const userOrgId = `${userId}_${organizationId}`
    const appointmentTypes = await this.acuityTypesRepository.fetchAll()
    const cartItemValidator = new JoiValidator(cartItemSchema)

    const cardItemDdModel = items.map(async item => {
      let appointment = null
      try {
        appointment = {
          slotId: item.slotId,
          ...decodeAvailableTimeId(item.slotId),
        }
      } catch (_) {
        throw new BadRequestException('Invalid slotId')
      }

      const appointmentType = appointmentTypes.find(
        appointmentType => Number(appointmentType.id) === appointment.appointmentTypeId,
      )
      if (!appointmentType) {
        LogError(CartFunctions.addItems, CartEvent.appointmentTypeNotFound, null)
        throw new ResourceNotFoundException('Appointment type not found')
      }

      const validCartItem = await cartItemValidator.validate({
        cartItemId: uuidv4(),
        patient: _.omit(item, ['slotId']),
        appointment,
        appointmentType: {
          price: appointmentType.price,
          name: appointmentType.name,
        },
      })

      return validCartItem
    })

    const cartItems = await Promise.all(cardItemDdModel)

    await this.userCartRepository.addBatch(userOrgId, cartItems)
  }

  async updateItem(userOrgId: string, cartItems: CartUpdateRequestDto): Promise<void> {
    const userCartItemRepository = new UserCartItemRepository(this.dataStore, userOrgId)
    const cartItemsData = await userCartItemRepository.findWhereEqual(
      'cartItemId',
      cartItems.cartItemId,
    )

    const cartItemExist = cartItemsData[0]
    if (!cartItemExist) {
      throw new ResourceNotFoundException('userCart-item with given id not found')
    }

    const appointment = {
      slotId: cartItems.slotId,
      ...decodeAvailableTimeId(cartItems.slotId),
    }

    const cartItem = {
      id: cartItemExist.id,
      cartItemId: cartItems.cartItemId,
      patient: _.omit(cartItems, ['slotId']),
      appointment,
      appointmentType: {
        price: cartItemExist.appointmentType.price,
        name: cartItemExist.appointmentType.name,
      },
    }
    const cartItemValidator = new JoiValidator(cartItemSchema)
    const validCartItem = await cartItemValidator.validate(cartItem)

    await userCartItemRepository.update(validCartItem)
  }

  async saveOrderInformation(
    appointmentCreateStatuses: CartItemStatus[],
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    await this.userOrderRepository.add({
      cartItems: appointmentCreateStatuses,
      payment: {
        ..._.pick(paymentIntent, [
          'id',
          'amount',
          'amount_capturable',
          'amount_received',
          'customer',
          'payment_method_types',
          'status',
        ]),
        charges: {
          data: paymentIntent.charges.data.map(charge =>
            _.pick(charge, ['amount', 'amount_captured', 'amount_refunded', 'created', 'status']),
          ),
        },
      },
    })
  }

  async deleteCartItem(userId: string, cartItemId: string, organizationId: string): Promise<void> {
    const userOrgId = `${userId}_${organizationId}`
    const userCartItemRepository = new UserCartItemRepository(this.dataStore, userOrgId)

    const cartItem = await userCartItemRepository.findWhereEqual('cartItemId', cartItemId)
    const cartId = cartItem[0].id
    await userCartItemRepository.delete(cartId)
  }

  async deleteAllCartItems(userId: string, organizationId: string): Promise<void> {
    const userOrgId = `${userId}_${organizationId}`
    const userCartItemRepository = new UserCartItemRepository(this.dataStore, userOrgId)

    await userCartItemRepository.deleteCollection()
  }

  /**
   * Validate if all appointment slots in the cart are available
   * stripeTotal: should be in cents
   */
  async validateUserCart(
    userId: string,
    organizationId: string,
  ): Promise<{
    cartDdItems: CardItemDBModel[]
    cardValidation: PaymentAuthorizationCartDto
  }> {
    const cartDdItems = await this.fetchUserAllCartItem(userId, organizationId)
    const cardValidation = await this.validateCart(cartDdItems)
    return {cartDdItems, cardValidation}
  }

  async discount(coupon: string, userId: string, organizationId: string): Promise<CartResponseDto> {
    const userOrgId = `${userId}_${organizationId}`
    const userCartItemRepository = new UserCartItemRepository(this.dataStore, userOrgId)

    const cardItems = await this.fetchUserAllCartItem(userId, organizationId)
    const discountedCartItems = await Promise.all(
      cardItems.map(async cartItem => {
        let discount
        let err
        try {
          discount = await this.acuityRepository.checkCoupon(
            coupon,
            cartItem.appointment.appointmentTypeId,
          )
        } catch (e) {
          for (const acuityErrorsKey in AcuityErrorValues) {
            if (e.message === AcuityErrorValues[acuityErrorsKey]) {
              err = e.message
            }
          }
        }
        if (discount?.discountAmount <= 0) {
          err = CouponErrorsEnum.exceed_count
        }
        const [cartItemDataDb] = await userCartItemRepository.findWhereEqual(
          'cartItemId',
          cartItem.cartItemId,
        )
        return userCartItemRepository.updateProperties(
          cartItemDataDb.id,
          err
            ? {
                appointmentType: {
                  ...cartItem.appointmentType,
                },
                discountData: {
                  error: err,
                },
              }
            : {
                appointmentType: {
                  ...cartItem.appointmentType,
                },
                discountData: {
                  discountType: discount.discountType,
                  discountAmount: discount.discountAmount,
                  name: discount.name,
                  couponId: discount.couponID,
                  expiration: discount.expiration,
                },
              },
        )
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
        cartDB.discountData.discountType,
        cartDB.discountData.discountAmount,
      ),
      discountedError: cartDB.discountData.error,
    }))

    const couponCode = discountedCartItems.find(cartItem => cartItem?.discountData?.name)
    return {
      cartItems: cartItems,
      paymentSummary: this.buildPaymentSummary(cartItems),
      cart: {
        couponCode: couponCode?.discountData ? couponCode.discountData.name : null,
      },
    }
  }
  private countDiscount(
    initialPrice: number,
    discountType: DiscountTypes,
    discountAmount: number,
  ): number {
    // eslint-disable-next-line max-lines
    return discountType === DiscountTypes.percentage
      ? initialPrice - (initialPrice * discountAmount) / 100
      : initialPrice - discountAmount
  }

  /**
   * Get cart total in stipe format
   */
  stripePriceFromCart(cartDdItems: CardItemDBModel[]): number {
    const round = num => Math.round(num * 100) / 100
    const sum = cartDdItems.reduce(
      (sum, item) => sum + (parseFloat(item.appointmentType.price) || 0),
      0,
    )
    const tax = round(sum * this.hstTax)
    const total = sum + tax
    const stripeTotal = round(total * 100)

    return stripeTotal
  }
}
