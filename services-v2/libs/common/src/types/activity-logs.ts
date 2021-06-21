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
  addItems = 'addItems',
  createBulkAppointment = 'createBulkAppointment',
}

export enum CartEvent {
  maxCartItems = 'maxCartItems',
  stripeCreateCustomer = 'stripeCreateCustomer',
  cartValidationError = 'cartValidationError',
  cartNotValid = 'cartNotValid',
  appointmentsBookingError = 'appointmentsBookingError',
  appointmentTypeNotFound = 'appointmentTypeNotFound',
  errorBookingAppointment = 'errorBookingAppointment',
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

export enum SwaggerFunctions {
  createSwagger = 'createSwagger',
}

export enum SwaggerEvents {
  attemptWithSwaggerDisabled = 'attemptWithSwaggerDisabled',
  noAuthCredentials = 'noAuthCredentials',
  invalidAuthCredentials = 'invalidAuthCredentials',
  shortAuthCredentials = 'shortAuthCredentials',
}

export enum ValidatorFunctions {
  validate = 'validate',
}

export enum ValidatorEvents {
  validationFailed = 'validationFailed',
}

export enum OpnHeaderFunctions {
  validateHeaders = 'validateHeaders',
}

export enum OpnHeaderEvents {
  ReadOpnHeaders = 'ReadOpnHeaders',
}

export enum PubSubFunctions {
  updateProfile = 'updateProfile',
  updateProfileWithPubSub = 'updateProfileWithPubSub',
}

export enum PubSubEvents {
  profileUpdateFailed = 'profileUpdateFailed',
  profileUpdateStarted = 'profileUpdateStarted',
}

export enum PatientServiceFunctions {
  addInPublicGroup = 'addInPublicGroup',
  createProfile = 'createProfile',
  createHomePatientProfile = 'createHomePatientProfile',
}

export enum PatientServiceEvents {
  syncV2ToV1Failed = 'syncV2ToV1Failed',
  duplicatedUserFound = 'duplicatedUserFound',
  errorAddingUserToOrg = 'errorAddingUserToOrg',
}
