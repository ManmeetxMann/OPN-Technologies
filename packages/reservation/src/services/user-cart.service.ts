import * as _ from 'lodash'
import {v4 as uuid} from 'uuid'

// Common
import DataStore from '../../../common/src/data/datastore'
import {AuthUser} from '../../../common/src/data/user'

// Provider
import {AcuityRepository} from '../respository/acuity.repository'
import {UserCartRepository, UserCartItemRepository} from '../respository/user-cart.repository'

// Models
import {CartRequest, CartResponse, CartItemResponse, CartSummaryResponse} from '../models/cart'

// Utils
import {decodeAvailableTimeId} from '../utils/base64-converter'
import {getUserId} from '../../../common/src/utils/auth'

/**
 * Stores cart items under ${userId}_${organizationId} key in user-cart collection
 */
export class UserCardService {
  private dataStore = new DataStore()
  private acuityRepository = new AcuityRepository()
  private userCartRepository = new UserCartRepository(this.dataStore)

  private htsTax = 0.13

  private buildPaymentSummary(cartItems: CartItemResponse[]): CartSummaryResponse[] {
    const round = (num) => Math.round(num * 100) / 100
    const sum = cartItems.reduce((sum, item) => sum + (item.price || 0), 0)
    const tax = round(sum * this.htsTax)
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
        label: `TAX (HST -${this.htsTax * 100}%)`,
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

  async getUserCart(authenticatedUser: AuthUser, organizationId: string): Promise<CartResponse> {
    const userId = getUserId(authenticatedUser)
    const userOrgId = `${userId}_${organizationId}`
    const userCartItemRepository = new UserCartItemRepository(this.dataStore, userOrgId)
    const cartDBItems = await userCartItemRepository.fetchAll()

    const cartItems = cartDBItems.map((cartDB) => ({
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

  async addItems(
    authenticatedUser: AuthUser,
    items: CartRequest[],
    organizationId: string,
  ): Promise<void> {
    const userId = getUserId(authenticatedUser)
    const userOrgId = `${userId}_${organizationId}`
    const appointmentTypes = await this.acuityRepository.getAppointmentTypeList()

    const cardItemDdModel = items.map((item) => {
      const appointment = decodeAvailableTimeId(item.slotId)
      const appointmentType = appointmentTypes.find(
        (appointmentType) => appointmentType.id === appointment.appointmentTypeId,
      )
      return {
        cartItemId: uuid(),
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

  async deleteItem(
    authenticatedUser: AuthUser,
    cartItemId: string,
    organizationId: string,
  ): Promise<void> {
    const userId = getUserId(authenticatedUser)
    const userOrgId = `${userId}_${organizationId}`
    const userCartItemRepository = new UserCartItemRepository(this.dataStore, userOrgId)

    const cartItem = await userCartItemRepository.findWhereEqual('cartItemId', cartItemId)
    const cartId = cartItem[0].id
    await userCartItemRepository.delete(cartId)
  }
}
