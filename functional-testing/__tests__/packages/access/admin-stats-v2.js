const frisby = require('frisby');
const helpersCommon = require('helpers_common');

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});
const serviceUrl = process.env.ACCESS_SERVICE_URL;

/**
 * @group reservation-service
 * @group /access/api/v1/admin/stats/v2
 * @group access-admin-stats-v2
 */
describe('Get admin-stats-v2', () => {
  test('able to successfully get admin-stats-v2', () => {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${serviceUrl}/admin/stats/v2`;
      return frisby
          .setup({
            request: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          })
          .post(url,{
            organizationId: "89BrZwateBqK4PvcBIP0"
          })
          .inspectBody()
          .expect('status', 200);
    });
  });
});
