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
 * @group /reservation/admin/api/v1/rapid-antigen-test-results
 * @group rapid-antigen-create
 */
describe('rapid-antigen-create', () => {
  test('able to successfully create Rapid Antigen Results', () => {
    return helpers_common.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/rapid-antigen-test-results`;
      return frisby
          .setup({
            request: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          })
          .post(url, [
            {
              appointmentID: 'PcCFDchvWyBCVnXMyGNk',
              action: 'DoNothing',
            },
            {
              appointmentID: 'cJXQ6JFKntMEuF33F7oG',
              action: 'SendNegative', // DoNothing, SendInconclusive, SendNegative, SendPositive
            },
          ])
          .inspectBody()
          .expect('status', 200);
    });
  });
});
