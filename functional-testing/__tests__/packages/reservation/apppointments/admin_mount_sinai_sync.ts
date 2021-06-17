import frisby from 'frisby'
import helpersCommon from '../../../../helpers/helpers_common'

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
    timeout: 60000,
  },
});
jest.setTimeout(60000);
const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;
// const organizationId = testProfile.get().organizationId;
/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/appointments/failed-confirmatory-request/sync
 * @group failed-confirmatory-request-sync
 */
describe('Sync Failed', () => {
  test('Sync Failed?', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/appointments/failed-confirmatory-request/sync`;
      return frisby
          .setup({
            request: {
              headers: {
                'Authorization': `Bearer ${token}`,
                'timeout': 60000,
              },
            },
          })
          .post(
              url,
              {
                failedResultsIds: [
                  'vl9ILkbUjeXxQmArmswj'
                ]
              },
          )
          .expect('status', 200)
          .inspectBody();
    });
  });
});

