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
 * @group /reservation/admin/api/v1/labs
 * @group create-lab
 */
describe('post:temperature', () => {
  test('should be successfull to create lab', () => {
    const url = `${reservationServiceUrl}/reservation/admin/api/v1/labs`;
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      return frisby
          .setup({
            request: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          })
          .post(url, {
            name: 'FRISBY_1',
          })
          .expect('status', 200);
    });
  });

  test('should fail to create lab: empty name', () => {
    const url = `${reservationServiceUrl}/reservation/admin/api/v1/labs`;
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      return frisby
          .setup({
            request: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          })
          .post(url, {
            name: '',
          })
          .expect('status', 400);
    });
  });

  test('should fail to create lab: missing name', () => {
    const url = `${reservationServiceUrl}/reservation/admin/api/v1/labs`;
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      return frisby
          .setup({
            request: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          })
          .post(url, {})
          .expect('status', 400);
    });
  });
});
