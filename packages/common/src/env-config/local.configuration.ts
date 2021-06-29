import {devConfig} from './dev.configuration'

// TEST_RESULTS_BUCKET_NAME: 'opn-platform-local-test-results',

export const localConfig = {
  ...devConfig,
  TEST_RESULTS_BUCKET_NAME: 'opn-platform-local-test-results',
}
