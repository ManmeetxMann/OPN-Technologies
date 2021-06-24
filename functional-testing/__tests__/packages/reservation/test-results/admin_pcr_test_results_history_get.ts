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
 * @group /reservation/admin/api/v1/pcr-test-results/history
 * @group get-pcr-results-history
 */
describe('Get BarCode History', () => {
  test('Get BarCode History', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results/history`;
      return frisby
          .setup({
            request: {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            },
          })
          .post(
              url,
              {
                'barcode': ['A1237', 'A1236', 'A1182', 'A1169', 'A1240'],
              },
          )
          .expect('status', 200)
          .inspectBody();
    });
  });
});
