import frisby from 'frisby'
import helpersCommon from '../../../../helpers/helpers_common'

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
 * @group reschedule-appointment
 */
describe('Reschedule Appointment', () => {
  test('reschedule Appointments as super admin?', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/appointments/S8ZNW3qLnpTL4DVovwyV/reschedule`;
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
                dateTime: '2021-03-05T10:25:00-0500',
              },
          )
          .expect('status', 200);
    });
  });
});

