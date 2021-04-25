import {AvailableTimeIdParams} from '@opn-reservation-v1/types/base64-coverter.type'
import {CreateAppointmentRequest} from '@opn-reservation-v1/models/appointment'
import {AppointmentTypes} from '@opn-reservation-v1/models/appointment-types'
import { firestore } from 'firebase-admin'

export type CartRequestItem = Omit<
  CreateAppointmentRequest,
  'organizationId' | 'packageCode' | 'userId'
>

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

export type OrderCartItemDBModel = {
  appointmentId: string
}

export type OrderPaymentDBModel = {
  intentId: string
  status: string
}

export type OrderDBModel = {
  id: string
  status: string
  cartItem: OrderCartItemDBModel[]
  payment: OrderPaymentDBModel
}
