export type AcuityAvailableSlots = {
  time: string
  slotsAvailable: number
}

export type CreateAppointmentDTO = {
  dateTime: string
  appointmentTypeID: number
  firstName: string
  lastName: string
  email: string
  phone: string
  packageCode: string
  calendarID: number
  fields: Record<string, string | boolean | number[]>
}

export enum AcuityErrors {
  not_available = 'not_available',
  certificate_uses = 'certificate_uses',
  invalid_certificate = 'invalid_certificate',
  expired_certificate = 'expired_certificate',
  invalid_certificate_type = 'invalid_certificate_type',
}

export enum AcuityErrorValues {
  not_available = 'is not available for appointments',
  certificate_uses = 'You organization has no more appointment credits left on account. Please contact your account manager.',
  invalid_certificate = 'The coupon is invalid.',
  expired_certificate = 'The certificate is expired.',
  invalid_certificate_type = 'The certificate is invalid for this appointment type.',
}
