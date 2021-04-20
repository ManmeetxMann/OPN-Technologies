const frisby = require('frisby');
const qs = require('qs');
const helpersCommon = require('helpers_common');

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

/**
 * @group reservation-service
 * @group /reservation/acuity_webhook/api/v1/appointment/create
 * @group sync-appointment-webhook
 */
describe('POST: /reservation/acuity_webhook/api/v1/appointment/create', () => {
  test('Post Data from Acuity to OPN successfully', function() {
    const url = `${reservationServiceUrl}/reservation/acuity_webhook/api/v1/appointment/sync`;
    console.log(url);
    return frisby
        .setup({
          request: {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        })
        .post(
            url, {
              body: qs.stringify({
                'calendarID': '4577880',
                'appointmentTypeID': '572702678',
                'id': '572702678', // 515676296
                'action': 'scheduled',
              }),
            },
        )
        .expect('status', 200)
        .inspectBody();
  });
});
