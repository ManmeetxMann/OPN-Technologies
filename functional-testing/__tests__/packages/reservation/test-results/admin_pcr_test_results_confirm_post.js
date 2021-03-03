const frisby = require('frisby');
const helpersCommon = require('helpersCommon');
const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});


/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/pcr-test-results/confirm
 * @group confirm-pcr-test-results
 */
describe('PCR TestResultsController', () => {
  test('Should be able to create PCR test results Successfully', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results/confirm`;
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
                'barCode': 'A705',
                'action': 'MarkAsNegative', // Indeterminate, MarkAsPositive, MarkAsNegative
              },
          )
          .expect('status', 200)
          .inspectBody();
    });
  });
});
