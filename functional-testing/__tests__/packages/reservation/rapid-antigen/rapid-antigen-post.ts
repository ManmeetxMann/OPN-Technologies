import frisby from 'frisby'
import helpersCommon from '../../../../helpers/helpers_common'

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
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
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
              appointmentID: 'BAD_ID',
              action: 'DoNothing',
            },
            {
              appointmentID: 'EzzTdp4YUfvOFrGV3gAr',
              action: 'SendPositive', // DoNothing, SendInconclusive, SendNegative, SendPositive
              sendAgain: true,
            },
          ])
          .inspectBody()
          .expect('status', 200);
    });
  });
});
