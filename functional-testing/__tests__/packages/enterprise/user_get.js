const frisby = require('frisby');
const helpersCommon = require('helpers_common');

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

const enterpriseServiceUrl = process.env.ENTERPRISE_SERVICE_URL;

/**
 * @group enterprise-service
 * @group get-user-account-test
 */
describe('create:user', () => {
  test('successfully create user?', () => {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${enterpriseServiceUrl}/enterprise/api/v3/users/self/dependents`;
      return frisby
          .setup({
            request: {
              headers: {
                Authorization: `Bearer ${token}`,
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
