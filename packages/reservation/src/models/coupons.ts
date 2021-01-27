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
