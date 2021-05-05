/**
 * Common configuration for All Environments
 */
export const commonConfig: Record<string, string | number | boolean> = {
  ACUITY_CALENDAR_URL: 'https://app.acuityscheduling.com/schedule.php',
  ACUITY_APPOINTMENT_TYPE_ID: 20791574,
  ACUITY_COUPON_ID: 1073154,
  ACUITY_FIELD_ADDITIONAL_ADDRESS_NOTES: 9112814,
  ACUITY_FIELD_ADDRESS_FOR_TESTING: 9112811,
  ACUITY_FIELD_ADDRESS_UNIT: 9082855,
  ACUITY_FIELD_ADDRESS: 9082854,
  ACUITY_FIELD_AGREE_TO_CONDUCT_FH_HEALTH_ACCESSMENT: 9082892,
  ACUITY_FIELD_BARCODE: 8622334,
  ACUITY_FIELD_DATE_OF_BIRTH: 8637043,
  ACUITY_FIELD_NEXT_DAY: 4508822,
  ACUITY_FIELD_NURSE_NAME: 8622344,
  ACUITY_FIELD_OHIP_CARD: 9158796,
  ACUITY_FIELD_ORGANIZATION_ID: 8842033,
  ACUITY_FIELD_READ_TERMS_AND_CONDITIONS: 9082890,
  ACUITY_FIELD_RECEIVE_NOTIFICATIONS_FROM_GOV: 9082893,
  ACUITY_FIELD_RECEIVE_RESULTS_VIA_EMAIL: 9082891,
  ACUITY_FIELD_SAME_DAY: 4508823,
  ACUITY_FIELD_SHARE_TEST_RESULT_WITH_EMPLOYER: 9112802,
  ACUITY_FIELD_SWAB_METHOD: 9158271,
  ACUITY_FIELD_TRAVEL_ID_ISSUEING_COUNTRY: 9158231,
  ACUITY_FIELD_TRAVEL_ID: 9158228,
  ACUITY_FIELD_GENDER: 9507941,
  ACUITY_FIELD_POSTAL_CODE: 9507871,
  ACUITY_SCHEDULER_API_URL: 'https://acuityscheduling.com',

  CAPTCHA_VERIFY_URL: 'https://www.google.com/recaptcha/api/siteverify',

  DEFAULT_TIME_ZONE: 'America/Toronto',
  // DEFAULT_ORG_ID: 'defaulttest001',
  // DEFAULT_GROUP_ID: 'defaulttestgroup001',
  DEFAULT_USER_PHOTO:
    'https://storage.googleapis.com/opn-platform-ca-prod.appspot.com/user_avatars/user_light.jpeg',

  EMAIL_FROM_NAME: 'StayOPN Team',

  TEST_APPOINTMENT_TOPIC: 'test-appointment-topic',
  PCR_TEST_TOPIC: 'pcr-test-topic',
  PASSPORT_TOPIC: 'passport-topic',
  TEMPERATURE_TOPIC: 'temperature-topic',
  ATTESTATION_TOPIC: 'attestation-topic',
  PUBSUB_TRACE_TOPIC: 'tracing',
  PUBSUB_TRACE_SUBSCRIPTION: 'executeTrace',

  PASSPORT_EXPIRY_DURATION_MAX_IN_HOURS: 12,
  PASSPORT_EXPIRY_TIME_DAILY_IN_HOURS: 7,
  STOP_PASSPORT_EXPIRY_DURATION_MAX_IN_WEEKS: 2,
  STOP_PASSPORT_EXPIRY_INCONCLUSIVE_HOURS: 24,
  STOP_PASSPORT_EXPIRY_PCR_HOURS: 336,
  PASSPORT_EXPIRY_PCR_HOURS: 60,

  TEMPERATURE_THRESHOLD: 37.4,
  OXYGEN_THRESHOLD: 93,
  RAPID_ALERGEN_DEADLINE_MIN: 7,
  PCR_VALIDITY_HOURS: 60,

  TEST_RESULT_ORG_COLLECT_NOTIFICATION_TEMPLATE_ID: 6,
  TEST_RESULT_NO_ORG_INCONCLUSIVE_COLLECT_NOTIFICATION_TEMPLATE_ID: 8,
  TEST_RESULT_NO_ORG_COLLECT_NOTIFICATION_TEMPLATE_ID: 5,
  TEST_RESULT_RERUN_NOTIFICATION_TEMPLATE_ID: 4,
  TEST_RESULT_EMAIL_TEMPLATE_ID: 2,
  TEST_RESULT_PRELIMNARY_RESULTS_TEMPLATE_ID: 9,
  TEST_RESULT_RAPID_ANTIGEN_TEMPLATE_ID: 10,
  TEST_RESULT_INVALID_RAPID_ANTIGEN_TEMPLATE_ID: 11,
  TEST_KIT_BATCH_ID: 'BPAIxOFguBQp8ADW2OKW',

  LINK_PRIVACYPOLICY: 'https://dev.pages.opnte.ch/privacy-policy.html',
  LINK_TERMSOFSERVICE: 'https://dev.pages.opnte.ch/terms-of-service.html',

  FH_LINK_PRIVACYPOLICY: 'https://dev.pages.opnte.ch/privacy-policy.html',
  FH_LINK_TERMSOFSERVICE: 'https://dev.pages.opnte.ch/terms-of-service.html',

  REPORT_BUCKET_NAME: 'opn-reports-staging',

  IS_SERVICE_V2_SWAGGER_ENABLED: false,
}