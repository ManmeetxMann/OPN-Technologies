const frisby = require('frisby');
const helpersCommon = require('helpers_common');
// const testProfile = require('test_profile');


// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;
// const organizationId = testProfile.get().organizationId;
/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/appointments
 * @group create-appointment-user
 */
describe('post:appointments', () => {
  test('create appointments successfully', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/api/v1/appointments`;
      return frisby
          .setup({
            request: {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            },
          })
          .post(
              url,
              {
                'slotId': '',
                'firstName': 'HSG',
                'lastName': 'Feb 1 11PM',
                'email': 'harpreet@stayopn.com',
                'phone': {
                  'code': 0,
                  'number': 0,
                },
                'dateOfBirth': '2021-01-27',
                'address': 'string',
                'addressUnit': 'string',
                'gender': 'Male',
                'postalCode': 'string',
                'couponCode': 'string',
                'shareTestResultWithEmployer': true,
                'agreeToConductFHHealthAssessment': true,
                'readTermsAndConditions': true,
                'receiveResultsViaEmail': true,
                'receiveNotificationsFromGov': true,
              },
          )
          .expect('status', 200)
          .inspectBody();
    });
  });
});
