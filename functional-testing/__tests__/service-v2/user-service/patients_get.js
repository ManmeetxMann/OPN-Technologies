const frisby = require('frisby');
const helpersCommon = require('helpers_common');
const testProfile = require('test_profile');


// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

const userServiceUrl = process.env.USER_SERVICE_URL;
const organizationId = testProfile.get().organizationId;
/**
 * @group user-service
 * @group /api/v1/patients
 * @group patient-get
 */
describe('get:patient', () => {
  test('get patient successfully', function() {
    return helpersCommon.runAuthenticatedTest(frisby,'harpreet+v2test1@stayopn.com').then(function(token) {
      const url = `${userServiceUrl}/api/v1/patients`;
      return frisby
          .setup({
            request: {
              headers: {
                'Authorization': `Bearer ${token}`,
                'organizationid':organizationId
              },
            },
          })
          .get(url)
          .expect('status', 200)
          .inspectBody();
    });
  });
});
