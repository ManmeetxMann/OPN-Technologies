import frisby from 'frisby'
import helpersCommon from '../../../../helpers/helpers_common'

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/pcr-test-results/add-test-run
 * @group add-test-run-to-pcr-test-results
 */
describe('PUT:admin:add test run', () => {
  test('Add Transport Run to PCR Results success?', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results/add-test-run`;
      return frisby
          .setup({
            request: {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            },
          })
          .put(
              url,
              {
                'testRunId': 'T210206-2',
                'pcrTestResultIds': ['FPuOftrNdC6j17NMtc4P'],
              },
          )
          .expect('status', 200)
          .inspectBody();
    });
  });
});
