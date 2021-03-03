const frisby = require('frisby');
const tv4 = require('tv4');
const moment = require('moment');
const helpersCommon = require('helpersCommon');
// const admin_tags_data = require('enterprise/admin_tags_data');
const testProfile = require('test_profile');
const schemaDefinations = require('reservation/test_result').schemaDefinations;
const test_results_data = require('reservation/test_results');
const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;
// const timeZone = process.env.DEFAULT_TIME_ZONE
const organizationId = testProfile.get().organizationId;

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

beforeAll(function() {

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
