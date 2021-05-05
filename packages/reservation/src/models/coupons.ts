export type Coupon = {
  id: string
  couponCode: string
  organizationId: string
  lastBarcode: string
}

export type AcuityCouponCodeResponse = {
  certificate: string
  appointmentTypeIDs: number[]
}

export type CouponCheckResponse = {
  id: number
  certificate: string
  couponID: string
  appointmentTypeIDs: number[]
  productIDs: string[]
  name: string
  type: string
  expiration: string
  discountType: string
  discountAmount: number
}
