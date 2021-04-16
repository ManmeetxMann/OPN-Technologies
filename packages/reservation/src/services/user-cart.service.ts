import * as _ from 'lodash'
import {v4 as uuid} from 'uuid'

// Common
import DataStore from '../../../common/src/data/datastore'

// Provider
import {AcuityRepository} from '../respository/acuity.repository'
import {UserCartRepository, UserCartItemRepository} from '../respository/user-cart.repository'

// Models
import {CartRequest, CartResponse, CartItemResponse, CartSummaryResponse} from '../models/cart'

// Utils
import {decodeAvailableTimeId} from '../utils/base64-converter'

export class UserCardService {
  private dataStore = new DataStore()
  private acuityRepository = new AcuityRepository()
  private userCartRepository = new UserCartRepository(this.dataStore)
  private paymentTax = 0.13

  private buildPaymentSummary(cartItems: CartItemResponse[]): CartSummaryResponse[] {
    const round = (num) => Math.round(num * 100) / 100
    const sum = cartItems.reduce((sum, item) => sum + (item.price || 0), 0)
    const tax = round(sum * this.paymentTax)
    const total = sum + tax

    const paymentSummary = [
      {
        uid: 'subTotal',
        label: 'SUBTOTAL',
        amount: sum,
        currency: 'CAD',
      },
      {
        uid: 'tax',
        label: 'SUBTOTAL',
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

  async getUserCart(userId: string): Promise<CartResponse> {
    const userCartItemRepository = new UserCartItemRepository(this.dataStore, userId)

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

  async addItems(userId: string, items: CartRequest[]) {
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

    this.userCartRepository.addBatch(userId, cardItemDdModel)
  }

  deleteItem() {}
}
