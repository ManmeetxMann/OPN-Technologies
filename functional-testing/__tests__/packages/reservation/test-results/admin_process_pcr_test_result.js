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
 * @group /reservation/internal/api/v1/process-pcr-test-result
 * @group post-process-pcr-test-result
 */
describe('/reservation/internal/api/v1/process-pcr-test-result:post', () => {
  test('process-pcr-test-result', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/internal/api/v1/process-pcr-test-result`;
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
              {reportTrackerId: 'rXVZ2iTC4aNmlDJV8FHj', resultId: 'UyUhg1evjeDZmrdBnCaK'},
          )
          .expect('status', 200)
          .inspectBody();
    });
  });
});
