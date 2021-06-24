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
 * @group admin-scan-history-create
 */
describe('admin-scan-history-create', () => {
  test('able to successfully create scan history', () => {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/admin-scan-history`;
      return frisby
          .setup({
            request: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          })
          .post(url, {
            barCode: 'A709',
            type: 'RapidAntigen',
            organizationId: 'TEST1',
          })
          .inspectBody()
          .expect('status', 200);
    });
  });
});
