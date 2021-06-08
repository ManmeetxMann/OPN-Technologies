import frisby from 'frisby';
import helpersCommon from '../../../../helpers/helpers_common';


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
 * @group admin-user
 */
describe('post:labs', () => {
  test('should be successfull to create lab', async () => {
    const url = `${reservationServiceUrl}/reservation/admin/api/v1/labs`;
    const token = await helpersCommon.runAuthenticatedTest(frisby)

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
          templateId: '1',
          assay: 'test',
        })
        .expect('status', 200);
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
// afterAll(() => setTimeout(() => process.exit(), 1000))
