const frisby = require('frisby');
const helpersCommon = require('helpers_common');
// const testProfile = require('test_profile');

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;
// const organizationId = testProfile.get().organizationId;
/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/appointments
 * @group copy-appointments
 */
describe('Copy Appointment', () => {
  test('Copy Appointments as super admin?', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/appointments/copy`;
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
                appointmentIds: ['lDRcL0txk0jQoIDZF9uh', 'xH055VGo4XVEwcaka2ax'],
                dateTime: '2021-03-14T08:30:00-0500',
              },
          )
          .expect('status', 200)
          .inspectBody();
    });
  });
});

