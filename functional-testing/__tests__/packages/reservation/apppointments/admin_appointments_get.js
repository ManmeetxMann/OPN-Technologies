const frisby = require('frisby');
const helpersCommon = require('helpers_common');
const testProfile = require('test_profile');

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;
const organizationId = testProfile.get().organizationId;
const labId = testProfile.get().labId;
/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/appointments
 * @group get-appointments-list
 */

describe('get:admin:appointments', () => {
  test('Get appoinments booked?', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/appointments?dateOfAppointment=2021-02-10`;
      return frisby
          .setup({
            request: {
              headers: {
                'Authorization': `Bearer ${token}`,
                'labid': labId,
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

  test('Get appoinments booked for organization?', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/appointments?dateOfAppointment=2021-02-23&organizationId=${organizationId}`;
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

  test('Get appoinments by BarCode', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/appointments?barCode=A880`;
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
