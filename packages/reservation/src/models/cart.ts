import {AvailableTimeIdParams} from '../types/base64-coverter.type'
import {AppointmentTypes} from './appointment-types'

import {CartAddDto} from '../../../../services-v2/apps/cart-service/src/dto/cart'

export type CardItemDBModel = {
  id: string
  cartItemId: string
  patient: Omit<CartAddDto, 'slotId'>
  appointment: AvailableTimeIdParams
  appointmentType: Pick<AppointmentTypes, 'name' | 'price'>
}
