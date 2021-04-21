import {AvailableTimeIdParams} from '../types/base64-coverter.type'

import {AppointmentTypes} from '../models/appointment-types'

export type CartRequest = {
  slotId: string
  firstName: string
  lastName: Date
  gender: string
  phone: {
    code: number
    number: number
  }
  dateOfBirth: string
  address: string
  addressUnit: string
  postalCode: string
  couponCode: string
  shareTestResultWithEmployer: true
  agreeToConductFHHealthAssessment: true
  readTermsAndConditions: true
  receiveResultsViaEmail: true
  receiveNotificationsFromGov: true
}

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

export type CardItemDBModel = {
  id: string
  cartItemId: string
  patient: Omit<CartRequest, 'slotId'>
  appointment: AvailableTimeIdParams
  appointmentType: Pick<AppointmentTypes, 'name' | 'price'>
}

export type UserCart = {
  id: string
  items: CardItemDBModel
}
