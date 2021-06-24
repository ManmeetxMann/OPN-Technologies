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
 * @group /reservation/admin/api/v1/test-kit-batch
 * @group create-test-kit-batch
 */
describe('create test-kit-batch', () => {
  test('should be successfull to create test-kit-batch', () => {
    const url = `${reservationServiceUrl}/reservation/admin/api/v1/test-kit-batch`;
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
            lotNumber: 'string',
            hardwareName: 'string',
            expiry: '2021-03-01T20:29:46.010Z',
            manufacturer: 'string',
          })
          .expect('status', 200);
    });
  });

  test('should fail to create test-kit-batch: empty lotNumber', () => {
    const url = `${reservationServiceUrl}/reservation/admin/api/v1/test-kit-batch`;
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
            lotNumber: '',
            hardwareName: 'string',
            expiry: '2021-03-01T20:29:46.010Z',
            manufacturer: 'string',
          })
          .expect('status', 400);
    });
  });

  test('should fail to create test-kit-batch: missing lotNumber', () => {
    const url = `${reservationServiceUrl}/reservation/admin/api/v1/test-kit-batch`;
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
            hardwareName: 'string',
            expiry: '2021-03-01T20:29:46.010Z',
            manufacturer: 'string',
          })
          .expect('status', 400);
    });
  });
});
