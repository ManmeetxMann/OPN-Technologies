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

export enum DiscountTypes {
  price = 'price',
  percentage = 'percentage',
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
  discountType: DiscountTypes
  discountAmount: number
}
