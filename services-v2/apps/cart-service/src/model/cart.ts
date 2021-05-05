import {Stripe} from 'stripe'
import {AvailableTimeIdParams} from '@opn-reservation-v1/types/base64-coverter.type'
import {CreateAppointmentRequest} from '@opn-reservation-v1/models/appointment'
import {AppointmentTypes} from '@opn-reservation-v1/models/appointment-types'
import {firestore} from 'firebase-admin'

export type CartRequestItem = Omit<CreateAppointmentRequest, 'userId'> & {email: string}

export type PaymentAuthorizationRequest = {
  paymentMethodId: string
}

export type CardItemDBModel = {
  id: string
  cartItemId: string
  patient: Omit<CartRequestItem, 'slotId'>
  appointment: AvailableTimeIdParams
  appointmentType: Pick<AppointmentTypes, 'name' | 'price'>
}

export type UserCartDBModel = {
  id: string
  items: CardItemDBModel
  updateOn: firestore.Timestamp
}

export type OrderPaymentDBModel = {
  intentId: string
  status: string
}

export type OrderDBModel = {
  id: string
  cartItems: CartItemStatus[]
  payment: Partial<Stripe.PaymentIntent>
}

export type CartItemStatus = {
  cartItemId: string
  appointmentId?: string
  isSuccess: boolean
}

export type AcuityDBModel = {
  id: string
  price: string
  name: string
}
