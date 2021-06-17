export type FirebaseError = {
  code: string
  message: string
}

// Cf. https://firebase.google.com/docs/reference/admin/error-handling#firebase-cloud-messaging
export enum FirebaseMessagingErrors {
  ThirdPartyAuthError = 'messaging/third-party-auth-error',
  InvalidArgument = 'messaging/invalid-argument',
  Internal = 'messaging/internal',
  QuotaExceeded = 'messaging/quota-exceeded',
  SenderIdMismatch = 'messaging/sender-id-mismatch',
  Unavailable = 'messaging/unavailable',
  Unregistered = 'messaging/unregistered',
  TokenNotRegistered = 'messaging/registration-token-not-registered',
}
