export const devConfig: Record<string, string | string[] | number | boolean> = {
  CORS_DOMAINS: [
    'http://localhost:3000',
    'https://opn-admin-dashboard-dev.nn.r.appspot.com',
    'https://fh-home-dev.nn.r.appspot.com',
  ],

  DOMAIN_ACCESS: 'https://access-dot-opn-platform-dev.nn.r.appspot.com/',
  DOMAIN_ENTERPRISE: 'https://enterprise-dot-opn-platform-dev.nn.r.appspot.com/',
  DOMAIN_LOOKUP: 'https://lookup-dot-opn-platform-dev.nn.r.appspot.com/',
  DOMAIN_PASSPORT: 'https://passport-dot-opn-platform-dev.nn.r.appspot.com/',
  DOMAIN_REGISTRY: 'https://registry-dot-opn-platform-dev.nn.r.appspot.com/',
  DOMAIN_RESERVATION: 'https://reservation-dot-opn-platform-dev.nn.r.appspot.com/',
  DOMAIN_CART: 'https://cart-service-dot-opn-platform-dev.nn.r.appspot.com/',

  AUTH_EMAIL_TEMPLATE_ID: 3,

  APPOINTMENTS_PUSH_NOTIFY: 'enabled',
  APPOINTMENTS_PUB_SUB_NOTIFY: 'enabled',
  TEST_RESULT_PUB_SUB_NOTIFY: 'enabled',

  FEATURE_CREATE_TOKEN_PERMISSIVE_MODE: 'enabled',
  FEATURE_PARENT_LOCATION_ID_MAY_BE_MISSING: 'enabled',
  FEATURE_ONLY_EMAIL_SUPPORT: 'enabled',
  FEATURE_CREATE_USER_ON_ENTERPRISE: 1,

  LOG_VALIDATION_ERRORS: 'enabled',

  IS_SERVICE_V2_SWAGGER_ENABLED: 'enabled',
}
