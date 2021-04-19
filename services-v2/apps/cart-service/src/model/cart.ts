import {Stripe} from 'stripe'

import {AvailableTimeIdParams} from '@opn-reservation-v1/types/base64-coverter.type'
import {CreateAppointmentRequest} from '@opn-reservation-v1/models/appointment'
import {AppointmentTypes} from '@opn-reservation-v1/models/appointment-types'

export type CartRequestItem = CreateAppointmentRequest

export type CartItemResponse = {
  cartItemId: string
  label: string
  subLabel: string
  patientName: string
  date: string
  price: number
}

export type CartSummaryResponse = {
  uid: string
  label: string
  amount: number
  currency: string
}

export type CartResponse = {
  cartItems: CartItemResponse[]
  paymentSummary: CartSummaryResponse[]
}

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

export type InvalidItemResponse = {
  cartItemId: string
  message: string
}

export type CardValidation = {
  isValid: boolean
  invalidItems: InvalidItemResponse[]
}

export type CardValidationResponse = Partial<Stripe.PaymentIntent> & {
  cardValidation: CardValidation
}

export type UserCartDBModel = {
  id: string
  items: CardItemDBModel
}
