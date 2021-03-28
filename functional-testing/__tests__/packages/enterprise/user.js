const frisby = require('frisby');
const helpersCommon = require('helpers_common');
const testProfile = require('test_profile');

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

const enterpriseServiceUrl = process.env.ENTERPRISE_SERVICE_URL;
const organizationId = testProfile.get().organizationId;

/**
 * @group enterprise-service
 * @group /user/connect/v2/add
 * @group create-user-account
 */
describe('create:user', () => {
  test('successfully create user?', () => {
    const displayName = `${testProfile.get().firstName} ${testProfile.get().lastName}`;
    const email = testProfile.get().email;

    return helpersCommon.getAuthToken(frisby, email, displayName).then(function(token) {
      const url = `${enterpriseServiceUrl}/user/connect/v2/add`;
      return frisby
          .post(
              url,
              {
                idToken: token,
                organizationId: organizationId,
                registrationId: '',
                firstName: testProfile.get().firstName,
                lastName: testProfile.get().lastName,
                base64Photo: `https://picsum.photos/200?${Date.now()}`,
                groupId: testProfile.get().groupId,
              },
          )
          .expect('status', 200);
    });
  });
});
