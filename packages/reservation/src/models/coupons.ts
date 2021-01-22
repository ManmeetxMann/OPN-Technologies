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

export type AcuityCreateResponse = {
  id: number
  firstName: string
  lastName: string
  phone: string
  email: string
  date: string
  time: string
  endTime: string
  dateCreated: string
  datetime: string
  price: string
  paid: string
  amountPaid: string
  type: string
  appointmentTypeID: number
  classID: null
  category: string
  duration: string
  calendar: string
  calendarID: 1
  location: string
  certificate: string
  confirmationPage: string
  formsText: string
  forms: {id: number; value: string}[]
  notes: string
  timezone: string
  labels: [
    {
      id: number
      name: string
      color: string
    },
  ]
}
