import {devConfig} from './dev.configuration'

export const localConfig = {
  ...devConfig,
  TEST_RESULTS_BUCKET_NAME: 'opn-platform-local-test-results',
  APPOINTMENTS_PUB_SUB_NOTIFY: 'disabled',
}
