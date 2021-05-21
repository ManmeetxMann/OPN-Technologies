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
 * @group patient-post
 */
describe('post:patient', () => {
  test('create patient successfully', function() {
    return helpersCommon.getAuthTokenByPhone(frisby, '+1 650-505-5050').then(function(token) {
      const url = `${userServiceUrl}/api/v1/patients`;
      return frisby
          .setup({
            request: {
              headers: {
                'Authorization': `Bearer ${token}`,
                'organizationid': organizationId,
              },
            },
          })
          .post(url, {
            'firstName': 'HSG_FN1',
            'lastName': 'HSG_LN1',
            'email': 'harpreet+v2test1@stayopn.com',
          })
          .expect('status', 200)
          .inspectBody();
    });
  });
});
