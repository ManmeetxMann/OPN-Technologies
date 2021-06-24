import frisby from 'frisby'
import helpersCommon from '../../../../helpers/helpers_common'

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;
// const organizationId = testProfile.get().organizationId
/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/appointments
 * @group get-my-appointment
 */
describe('get:appointments', () => {
  test('get my appointments successfully', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/api/v1/appointments/self`;
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
