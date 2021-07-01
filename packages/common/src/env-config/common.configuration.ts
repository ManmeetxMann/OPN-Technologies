/**
 * Common configuration for All Environments
 */
export const commonConfig: Record<string, string | string[] | number | boolean> = {
  ACUITY_CALENDAR_URL: 'https://app.acuityscheduling.com/schedule.php',
  ACUITY_APPOINTMENT_TYPE_ID: 20791574,
  ACUITY_APPOINTMENT_TYPE_MULTIPLEX: 21081115,
  ACUITY_COUPON_ID_FOR_RESAMPLE: 1073154,
  ACUITY_COUPON_ID_FOR_RAPIDHOME: 1236269,
  ACUITY_FIELD_ADDITIONAL_ADDRESS_NOTES: 9112814,
  ACUITY_FIELD_ADDRESS_FOR_TESTING: 9112811,
  ACUITY_FIELD_ADDRESS_STREET: 9968812,
  ACUITY_FIELD_ADDRESS: 9082854,
  ACUITY_FIELD_ADDRESS_UNIT: 9082855,
  ACUITY_FIELD_CITY: 9717163,
  ACUITY_FIELD_PROVINCE: 9717173,
  ACUITY_FIELD_COUNTRY: 9717176,
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
  ACUITY_FIELD_AGREE_CANCELLATION_REFUND: 9742364,
  ACUITY_FIELD_HAD_COVID_CONFIRMED: 9717485,
  ACUITY_FIELD_HAD_COVID_CONFIRMED_DATE: 9717480,
  ACUITY_FIELD_HAD_COVID_EXPOSURE: 9717484,
  ACUITY_FIELD_HAD_COVID_EXPOSURE_DATE: 9717489,

  ACUITY_SCHEDULER_API_URL: 'https://acuityscheduling.com',

  CAPTCHA_VERIFY_URL: 'https://www.google.com/recaptcha/api/siteverify',

  DEFAULT_TIME_ZONE: 'America/Toronto',
  DEFAULT_USER_PHOTO:
    'https://storage.googleapis.com/opn-platform-ca-prod.appspot.com/user_avatars/user_light.jpeg',
  PUBLIC_ORG_ID: 'PUBLIC_ORG',
  PUBLIC_GROUP_ID: 'PUBLIC_GROUP',
  PUBLIC_LOCATION_ID: 'PUBLIC_LOCATION',

  EMAIL_FROM_NAME: 'StayOPN Team',

  TEST_APPOINTMENT_TOPIC: 'test-appointment-topic',
  PCR_TEST_TOPIC: 'pcr-test-topic',
  PASSPORT_TOPIC: 'passport-topic',
  TEMPERATURE_TOPIC: 'temperature-topic',
  ATTESTATION_TOPIC: 'attestation-topic',
  PUBSUB_TRACE_TOPIC: 'tracing',
  PUBSUB_TRACE_SUBSCRIPTION: 'executeTrace',
  PRESUMPTIVE_POSITIVE_RESULTS_TOPIC: 'presumptive-positive-result-topic',
  PATIENT_UPDATE_TOPIC: 'patient-update-topic',

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

  PDF_GENERATION_EMAIL_THRESHOLD: 100,

  CART_EXPIRATION_HOURS: 24,

  TEST_RESULT_ORG_COLLECT_NOTIFICATION_TEMPLATE_ID: 6,
  TEST_RESULT_NO_ORG_INCONCLUSIVE_COLLECT_NOTIFICATION_TEMPLATE_ID: 8,
  TEST_RESULT_NO_ORG_COLLECT_NOTIFICATION_TEMPLATE_ID: 5,
  TEST_RESULT_RERUN_NOTIFICATION_TEMPLATE_ID: 4,
  TEST_RESULT_EMAIL_TEMPLATE_ID: 2,
  TEST_RESULT_PRELIMNARY_RESULTS_TEMPLATE_ID: 9,
  TEST_RESULT_RAPID_ANTIGEN_TEMPLATE_ID: 10,
  TEST_RESULT_INVALID_RAPID_ANTIGEN_TEMPLATE_ID: 11,
  TEST_KIT_BATCH_ID: 'BPAIxOFguBQp8ADW2OKW',
  TEST_KIT_BATCH_MULTIPLEX_ID: '0sjTy7GMJabtQZSXg0hq',
  LINK_PRIVACYPOLICY: 'https://dev.pages.opnte.ch/privacy-policy.html',
  LINK_TERMSOFSERVICE: 'https://dev.pages.opnte.ch/terms-of-service.html',

  FH_LINK_PRIVACYPOLICY: 'https://www.fhhealth.com/privacy-policy',
  FH_LINK_TERMSOFSERVICE: 'https://www.fhhealth.com/terms-of-service',

  REPORT_BUCKET_NAME: 'opn-reports-staging',

  IS_SERVICE_V2_SWAGGER_ENABLED: false,
  CLINIC_CODE_MOUNT_SINAI_CONFIRMATORY: 'MS112',
  CLINIC_CODE_FOR_MOUNT_SINAI_LAB: 'MS117',

  QUICKBLOX_PROVIDER_ID: 128003204,
  TEST_RESULT_MOUNT_SINAI_SYNC: 'disabled',

  RAPID_ANTIGEN_KIT_USE_COUNT: 5,
  QR_LINK_EXPIRATION_TIME: ((60 * 24 * 7) - 1) * 60 *  1000, //7 Days minus 1 minute
}
