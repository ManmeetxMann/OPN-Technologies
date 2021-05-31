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
 * @group /reservation/admin/api/v1/test-kit-batch
 * @group test-kit-batch-get
 */
describe('Get test-kit-batch', () => {
  test('able to successfully get test-kit-batch', () => {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/test-kit-batch`;
      return frisby
          .setup({
            request: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          })
          .get(url)
          // .inspectBody()
          .expect('status', 200);
    });
  });
});
