import frisby from 'frisby'
import helpersCommon from '../../../../helpers/helpers_common'


// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;
/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/pcr-test-results/list/stats
 * @group get-stats-pcr-test-results
 */

describe('PCR test results stats', () => {
  test('Get PCR test results stats successfullly?', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results/list/stats?date=2021-02-22`;
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
  test('Get PCR test results stats successfullly for date, organizationId & testType?', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results/list/stats?date=2021-03-11&testType=PCR&organizationId=TEST1`;
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
