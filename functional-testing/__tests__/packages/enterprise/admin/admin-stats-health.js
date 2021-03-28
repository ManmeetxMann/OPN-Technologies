const frisby = require('frisby');
const helpersCommon = require('helpers_common');

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});
const serviceUrl = process.env.ENTERPRISE_SERVICE_URL;

/**
 * @group reservation-service
 * @group /access/api/v1/admin/stats/v2
 * @group enterprise-admin-stats-health
 */
describe('Get admin-stats-v2', () => {
  test('able to successfully get admin-stats-v2', () => {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${serviceUrl}/organizations/89BrZwateBqK4PvcBIP0/stats/health`;
      return frisby
          .setup({
            request: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          })
          .get(url)
          .inspectBody()
          .expect('status', 200);
    });
  });
});
