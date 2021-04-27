import {Injectable} from '@nestjs/common'
// V1 Common
import DataStore from '@opn-common-v1/data/datastore'
import {AcuityRepository} from '@opn-reservation-v1/respository/acuity.repository'
import {decodeAvailableTimeId} from '@opn-reservation-v1/utils/base64-converter'

// Libs
import * as _ from 'lodash'
import {v4 as uuidv4} from 'uuid'

// Provider
import {UserCartRepository, UserCartItemRepository} from '../repository/user-cart.repository'
import {UserOrderRepository} from '../repository/user-order.repository'

// Models
import {CardItemDBModel} from '../model/cart'
import {CartValidationItemDto} from '../dto'

import {
  CartAddDto,
  CartResponseDto,
  CartSummaryDto,
  CartItemDto,
  PaymentAuthorizationCartDto,
} from '../dto'
import {firestoreTimeStampToUTC} from '@opn-reservation-v1/utils/datetime.helper'
import * as moment from 'moment'
import {ConfigService} from '@nestjs/config'

/**
 * Stores cart items under ${userId}_${organizationId} key in user-cart collection
 */
@Injectable()
export class UserCardService {
  private dataStore = new DataStore()
  private acuityRepository = new AcuityRepository()
  private userCartRepository = new UserCartRepository(this.dataStore)
  private userOrderRepository = new UserOrderRepository(this.dataStore)

  private hstTax = 0.13
  public timeSlotNotAvailMsg = 'Time Slot Unavailable: Book Another Slot'

  constructor(private configService: ConfigService) {}

  private buildPaymentSummary(cartItems: CartItemDto[]): CartSummaryDto[] {
    const round = num => Math.round(num * 100) / 100
    const sum = cartItems.reduce((sum, item) => sum + (item.price || 0), 0)
    const tax = round(sum * this.hstTax)
    const total = sum + tax

    if (total == 0) {
      return []
    }

    const paymentSummary = [
      {
        uid: 'subTotal',
        label: 'SUBTOTAL',
        amount: sum,
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

    // TODO check why this validation call returns weird result
    // const timeCheckItems = _.uniqBy(cartDdItems, (elem) => {
    //   return JSON.stringify(
    //     _.pick(elem, [
    //       'appointment.time',
    //       'appointment.appointmentTypeId',
    //       'appointment.calendarId',
    //     ]),
    //   )
    // }).map((el) => ({
    //   datetime: el.appointment.time,
    //   appointmentTypeID: el.appointment.appointmentTypeId,
    //   calendarId: el.appointment.calendarId,
    // }))
    // console.log(timeCheckItems)
    // console.log(await this.acuityRepository.getAvailableByTimes(timeCheckItems))

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
      const userCarts = await this.userCartRepository.fetchAllWithPagination(iteration, 2)
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

  async getUserCart(userId: string, organizationId: string): Promise<CartResponseDto> {
    const cartDBItems = await this.fetchUserAllCartItem(userId, organizationId)
    const cartItems = cartDBItems.map(cartDB => ({
      cartItemId: cartDB.cartItemId,
      label: cartDB.appointmentType.name,
      subLabel: cartDB.appointment.calendarName,
      patientName: `${cartDB.patient.lastName} ${cartDB.patient.lastName}`,
      date: cartDB.appointment.date,
      price: parseFloat(cartDB.appointmentType.price),
    }))

    return {
      cartItems,
      paymentSummary: this.buildPaymentSummary(cartItems),
    }
  }

  async addItems(userId: string, organizationId: string, items: CartAddDto[]): Promise<void> {
    const userOrgId = `${userId}_${organizationId}`
    const appointmentTypes = await this.acuityRepository.getAppointmentTypeList()

    const cardItemDdModel = items.map(item => {
      const appointment = decodeAvailableTimeId(item.slotId)
      const appointmentType = appointmentTypes.find(
        appointmentType => appointmentType.id === appointment.appointmentTypeId,
      )
      return {
        cartItemId: uuidv4(),
        patient: _.omit(item, ['slotId']),
        appointment,
        appointmentType: {
          price: appointmentType.price,
          name: appointmentType.name,
        },
      }
    })

    await this.userCartRepository.addBatch(userOrgId, cardItemDdModel)
  }

  async deleteItem(userId: string, cartItemId: string, organizationId: string): Promise<void> {
    const userOrgId = `${userId}_${organizationId}`
    const userCartItemRepository = new UserCartItemRepository(this.dataStore, userOrgId)

    const cartItem = await userCartItemRepository.findWhereEqual('cartItemId', cartItemId)
    const cartId = cartItem[0].id
    await userCartItemRepository.delete(cartId)
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
    console.log(cardValidation)
    return {cartDdItems, cardValidation}
  }

  /**
   * converts acuity price format to Stripe amount in cent
   */
  stripePriceWithTax(acuityPrice: string): number {
    const price = parseFloat(acuityPrice)
    const tax = price + price * this.hstTax
    const total = price + tax
    return total * 100
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
    const stripeTotal = total * 100

    return stripeTotal
  }
}
