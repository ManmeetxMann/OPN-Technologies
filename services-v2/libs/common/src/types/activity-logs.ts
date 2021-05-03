export enum UserFunctions {
  add = 'add',
  update = 'update',
  addDependents = 'addDependents',
}

export enum UserEvent {
  createPatient = 'createPatient',
  updateProfile = 'updateProfile',
}

export enum CartFunctions {
  addCartItem = 'addCartItem',
  creteEphemeralKeys = 'creteEphemeralKeys',
  paymentAuthorization = 'paymentAuthorization',
  checkout = 'checkout',
  cancelBulkAppointment = 'cancelBulkAppointment',
}

export enum CartEvent {
  maxCartItems = 'maxCartItems',
  stripeCreateCustomer = 'stripeCreateCustomer',
  cartValidationError = 'cartValidationError',
  cartNotValid = 'cartNotValid',
  appointmentsBookingError = 'appointmentsBookingError',
}

export enum CaptchaFunctions {
  verify = 'verify',
}

export enum CaptchaEvents {
  captchaServiceFailed = 'captchaServiceFailed',
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
