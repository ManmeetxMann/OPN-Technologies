const frisby = require('frisby');
import helpersCommon from '../../../../../helpers/helpers_common';
import testProfile from '../../../../../test_data/test_profile';
// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL
const organizationId = testProfile.get().organizationId

const getLocations = (token:string) => {
  const url = `${reservationServiceUrl}/reservation/api/v1/booking-locations?organizationId=${organizationId}`;
  return frisby
      .setup({
        request: {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        },
      })
      .get(
          url,
      )
      .expect('status', 200);
};

if (!module.parent) {
  /**
     * @group reservation-service
     * @group /reservation/admin/api/v1/booking-locations
     * @group get-booking-locations
     * @group reg-user
     */
  describe('get:booking locations', () => {
    test('should get list of booking locations successfully?', async () => {
      const token = await helpersCommon.runAuthenticatedTest(frisby)
      await getLocations(token)
            //.inspectBody();
    });

    test('should fail to get locations for missing OrganiationID?', function() {
      return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
        const url = `${reservationServiceUrl}/reservation/api/v1/booking-locations`;
        return frisby
            .setup({
              request: {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              },
            })
            .get(
                url,
            )
            .expect('status', 400);
      });
    });

    test('should fail to get locations for not logged in user.', function() {
      const url = `${reservationServiceUrl}/reservation/api/v1/booking-locations?organizationId=${organizationId}`;
      return frisby
          .setup({
            request: {
              headers: {
                'Authorization': `Bearer XX`,
              },
            },
          })
          .get(
              url,
          )
          .expect('status', 401)
          //.inspectBody();
    });

    test('should fail to get locations for invalid ORG.', function() {
      return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
        const url = `${reservationServiceUrl}/reservation/api/v1/booking-locations?organizationId=XXX`;
        return frisby
            .setup({
              request: {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              },
            })
            .get(
                url,
            )
            .expect('status', 200)
            //.inspectBody();
      });
    });
  });
}
export {getLocations}
