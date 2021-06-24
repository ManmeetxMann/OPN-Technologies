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
 * @group /reservation/admin/api/v1/pcr-test-results-bulk/report-status
 * @group get-bulk-report-status
 */
describe('Get Report Status', () => {
  test('Get Report Status', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results-bulk/report-status?reportTrackerId=rXVZ2iTC4aNmlDJV8FHj`;
      return frisby
          .setup({
            request: {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            },
          })
          .get(
              url,
          )
          .expect('status', 200)
          .inspectBody();
    });
  });
});
