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
                'calendarID': '4571103',
                'appointmentTypeID': '22492585',
                'id': '582128684', // 515676296
                'action': 'scheduled',
              }),
            },
        )
        .expect('status', 200)
        .inspectBody();
  });
});
