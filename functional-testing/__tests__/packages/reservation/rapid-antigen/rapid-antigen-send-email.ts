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
 * @group /reservation/internal/api/v1/rapid-alergen-send-result-email
 * @group rapid-antigen-send-email
 */
describe('rapid-antigen-send-email', () => {
  test('able to successfully send Rapid Antigen Results via Email', () => {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/internal/api/v1/rapid-antigen-send-result-email`;
      return frisby
          .setup({
            request: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          })
          .post(url, {
            message: {
              publishTime: '2021-02-26T18:48:03.418Z',
              message_id: '1992863589247666',
              messageId: '1992863589247666',
              data: 'eyJhcHBvaW50bWVudElEIjoiTkc4WmVoaGNDdldXMXUzQUJ4bEkiLCJ0ZXN0UmVzdWx0SUQiOiJTQU1TQXl6TUhwdk9ITXZRMEdmVyJ9',
              publish_time: '2021-02-26T18:48:03.418Z',
            },
            subscription: 'projects/opn-platform-dev/subscriptions/rapid-alergen-test-result-subscription',
          })
          .inspectBody()
          .expect('status', 200);
    });
  });
});
