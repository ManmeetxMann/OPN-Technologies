const frisby = require('frisby');
const helpersCommon = require('helpers_common');

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;

/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/appointments/barcode/regenerate
 * @group regenerate-barcode
 */
describe('get:admin:appointment:regenerate', () => {
  test('Regenerate BarCode', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/appointments/barcode/regenerate`;
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
                'appointmentId': 'swNiFxGI1aYE8qFxhRND',
              },
          )
          .expect('status', 200)
          .inspectBody();
    });
  });
});
