const frisby = require('frisby');
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
 * @group /reservation/internal/api/v1/appointments/sync-from-acuity
 * @group sync-internal-appointment
 */
describe('POST: /reservation/internal/api/v1/appointments/sync-from-acuity', () => {
  test('Post Data from Acuity to OPN successfully', function() {
    const url = `${reservationServiceUrl}/reservation/internal/api/v1/appointments/sync-from-acuity`;
    console.log(url);
    return frisby
        .post(
            url,
            {
              'calendarID': '4577880',
              'appointmentTypeID': '572702678',
              'acuityID': '572702678', // 515676296
              'action': 'scheduled',
            },
        )
        .expect('status', 200)
        .inspectBody();
  });
});
