import {BadRequestException} from '../../../common/src/exceptions/bad-request-exception'
import {BookingLocationIdParams, AvailableTimeIdParams} from '../types/base64-coverter.type'

export const encodeBookingLocationId = (idBuf: BookingLocationIdParams): string => {
  return Buffer.from(JSON.stringify(idBuf)).toString('base64')
}

export const decodeBookingLocationId = (id: string): BookingLocationIdParams => {
  let serializedId: BookingLocationIdParams
  try {
    serializedId = JSON.parse(Buffer.from(id, 'base64').toString())
  } catch (error) {
    throw new BadRequestException('Invalid Id')
  }

  const {calendarTimezone, appointmentTypeId, calendarId, organizationId, packageCode} =
    serializedId

  if (
    !calendarTimezone ||
    !appointmentTypeId ||
    !calendarId ||
    !organizationId ||
    (!packageCode && packageCode != '')
  ) {
    throw new BadRequestException('Invalid Id')
  }

  return serializedId
}

export const encodeAvailableTimeId = (idBuf: Partial<AvailableTimeIdParams>): string => {
  return Buffer.from(JSON.stringify(idBuf)).toString('base64')
}

export const decodeAvailableTimeId = (id: string): AvailableTimeIdParams => {
  let serializedId: AvailableTimeIdParams
  try {
    serializedId = JSON.parse(Buffer.from(id, 'base64').toString())
  } catch (error) {
    throw new BadRequestException('Invalid Id')
  }

  const {appointmentTypeId, calendarTimezone, calendarId, date, time, organizationId, packageCode} =
    serializedId

  if (
    !date ||
    !time ||
    !calendarTimezone ||
    !appointmentTypeId ||
    !calendarId ||
    !organizationId ||
    (!packageCode && packageCode != '')
  ) {
    throw new BadRequestException('Invalid Id')
  }

  return serializedId
}
