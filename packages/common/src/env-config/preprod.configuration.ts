export const preprodConfig: Record<string, string | string[] | number | boolean> = {
  // TODO: add production origin domains
  CORS_DOMAINS: [],

  DASHBOARD_URL: 'https://opn-admin-dashboard-preprod.nn.r.appspot.com',
  DOMAIN_ACCESS: 'https://access-dot-opn-platform-preprod.nn.r.appspot.com/',
  DOMAIN_ENTERPRISE: 'https://enterprise-dot-opn-platform-preprod.nn.r.appspot.com/',
  DOMAIN_LOOKUP: 'https://lookup-dot-opn-platform-preprod.nn.r.appspot.com/',
  DOMAIN_PASSPORT: 'https://passport-dot-opn-platform-preprod.nn.r.appspot.com/',
  DOMAIN_REGISTRY: 'https://registry-dot-opn-platform-preprod.nn.r.appspot.com/',
  DOMAIN_RESERVATION: 'https://reservation-dot-opn-platform-preprod.nn.r.appspot.com/',
  DOMAIN_CHECKOUT: 'https://checkout-service-dot-opn-platform-preprod.nn.r.appspot.com/checkout/',
  DOMAIN_USER: 'https://user-service-dot-opn-platform-preprod.nn.r.appspot.com/user/',

  AUTH_EMAIL_TEMPLATE_ID: 1,

  // APPOINTMENTS_PUSH_NOTIFY: 'enabled',
  // APPOINTMENTS_PUB_SUB_NOTIFY: 'enabled',
  // TEST_RESULT_PUB_SUB_NOTIFY: 'enabled',

  FEATURE_CREATE_TOKEN_PERMISSIVE_MODE: 'enabled',
  FEATURE_PARENT_LOCATION_ID_MAY_BE_MISSING: 'enabled',
  // FEATURE_ONLY_EMAIL_SUPPORT: 'enabled',
  // FEATURE_CREATE_USER_ON_ENTERPRISE: 1,
  LOG_VALIDATION_ERRORS: 'enabled',

  REPORT_BUCKET_NAME: '1',
}
