import {Stripe} from 'stripe'

import {firestore} from 'firebase-admin'

import {CardItemDBModel} from '@opn-reservation-v1/models/cart'

export type PaymentAuthorizationRequest = {
  paymentMethodId: string
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
  errorMessage?: string
}

export type AcuityDBModel = {
  id: string
  price: string
  name: string
}

export enum CouponErrorsEnum {
  invalid_certificate_type = 'This appointment type not included with this coupon',
  exceed_count = 'The coupon count exceed',
}

export {CardItemDBModel}
