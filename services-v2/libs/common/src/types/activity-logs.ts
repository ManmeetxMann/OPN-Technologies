export enum UserFunctions {
  update = 'update',
}

export enum UserEvent {
  updateProfile = 'updateProfile',
}

export enum CartFunctions {
  addCartItem = 'addCartItem',
  creteEphemeralKeys = 'creteEphemeralKeys',
  paymentAuthorization = 'paymentAuthorization',
  checkout = 'checkout',
  cancelBulkAppointment = 'cancelBulkAppointment',
  addItems = 'addItems',
}

export enum CartEvent {
  maxCartItems = 'maxCartItems',
  stripeCreateCustomer = 'stripeCreateCustomer',
  cartValidationError = 'cartValidationError',
  cartNotValid = 'cartNotValid',
  appointmentsBookingError = 'appointmentsBookingError',
  appointmentTypeNotFound = 'appointmentTypeNotFound',
}

export enum StripeFunctions {
  createUser = 'createUser',
  customerEphemeralKeys = 'customerEphemeralKeys',
  createPaymentIntent = 'createPaymentIntent',
  cancelPaymentIntent = 'cancelPaymentIntent',
  capturePaymentIntent = 'capturePaymentIntent',
}

export enum StripeEvent {
  ephemeralKeysError = 'ephemeralKeysError',
  paymentIntentsError = 'paymentIntentsError',
}
