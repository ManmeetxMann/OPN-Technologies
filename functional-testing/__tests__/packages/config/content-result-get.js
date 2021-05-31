const frisby = require('frisby');
const helpersCommon = require('helpers_common');

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});
const serviceUrl = process.env.CONFIG_SERVICE_URL;

/**
 * @group reservation-service
 * @group /config/api/v1/content/result
 * @group content-result-get
 */
describe('Get content-result-get', () => {
  test('able to successfully get content-result-get', () => {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${serviceUrl}/config/api/v1/content/result?doctor=1&lang=en`;
      return frisby
          .setup({
            request: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          })
          .get(url)
          // .inspectBody()
          .expect('status', 200);
    });
  });
});
