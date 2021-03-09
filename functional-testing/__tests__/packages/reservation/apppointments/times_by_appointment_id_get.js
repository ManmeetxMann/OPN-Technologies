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
 * @group /reservation/api/v1/dates-by-appointment-id
 * @group get-times-by-appointment-id
 */
describe('get:availability dates by appointment', () => {
  it('should get availability dates successfully by appointment id?', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/availability/times-by-appointment-id`;
      url +=`?appointmentId=${appointmentId}&date=2021-03-10`;
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
