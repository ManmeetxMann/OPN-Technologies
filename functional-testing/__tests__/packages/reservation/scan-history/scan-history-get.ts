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
 * @group /reservation/admin/api/v1/admin-scan-history
 * @group admin-scan-history-get
 */
describe('admin-scan-history-get', () => {
  test('able to successfully get scan history', () => {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/admin-scan-history?type=RapidAntigen`;
      return frisby
          .setup({
            request: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          })
          .get(url)
          .inspectBody()
          .expect('status', 200);
    });
  });
});
