import frisby from 'frisby'
import helpersCommon from '../../../../helpers/helpers_common'
import testProfile from '../../../../test_data/test_profile'

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
 * @group cancel-appointment
 */
describe('Cancel Appointment', () => {
  test('Cancel Appointments as super admin?', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/appointments/4OOQ3Wqf80p4cZrhY7Mx/cancel`;
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
          )
          .expect('status', 200);
    });
  });


  test('Cancel ORG appointments?', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/appointments/501236178/cancel?organizationId=${organizationId}`;
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
          )
          .expect('status', 200);
    });
  });
});

