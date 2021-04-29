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
 * @group /reservation/admin/api/v2/appointments/add-labels
 * @group add-labels-to-appointments
 */
describe('PUT:admin:appointments:add_labels', () => {
  test('Add SameDay or NextDay Label to Appoinment?', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v2/appointments/add-labels`;
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
              {
                'appointmentIds': ['sXdtSlx4az2casuPmHFF'],
                'label': 'NextDay',
              },
          )
          .expect('status', 200);
    });
  });
});
