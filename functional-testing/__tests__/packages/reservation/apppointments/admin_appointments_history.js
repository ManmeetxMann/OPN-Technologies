const frisby = require('frisby');
const helpersCommon = require('helpers_common');
const testProfile = require('test_profile');

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;
const organizationId = testProfile.get().organizationId;
/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/appointments
 * @group get-appointments-history
 */

describe('get:admin:appointments', () => {
  test('Get appoinments booked?', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/appointments/S8ZNW3qLnpTL4DVovwyV/history`;
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
