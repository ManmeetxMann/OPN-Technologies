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
 * @group /reservation/internal/api/v1/rapid-alergen-send-result-email
 * @group rapid-antigen-send-email
 */
describe('rapid-antigen-send-email', () => {
  test('able to successfully send Rapid Antigen Results via Email', () => {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/internal/api/v1/rapid-alergen-send-result-email`;
      return frisby
          .setup({
            request: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          })
          .post(url, {
            appointmentID: 'PcCFDchvWyBCVnXMyGNk'
          })
          .inspectBody()
          .expect('status', 200);
    });
  });
});
