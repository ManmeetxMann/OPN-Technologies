const frisby = require('frisby');
const helpersCommon = require('helpers_common');
const testProfile = require('test_profile');

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;
const organizationId = testProfile.get().organizationId;

/**
 * @group reservation-service
 * @group /reservation/api/v1/availability/slots
 * @group get-availability-times
 */
describe('get:availability times', () => {
  test('should get availability times successfully?', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/api/v1/booking-locations?organizationId=${organizationId}`;
      let encodeId = null;
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
          .then((response)=>{
            console.log(response);
            expect(response.json.data.length).toBeGreaterThan(0);
            if (response.json.data.length>0) {
              encodeId = response.json.data[0].id;
              const url = `${reservationServiceUrl}/reservation/api/v1/availability/dates?year=2021&month=04&id=${encodeId}`;
              console.log(url);
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
                  .inspectBody();
            }
          })
          .then((responseDates)=>{
            const url = `${reservationServiceUrl}/reservation/api/v1/availability/times?date=${responseDates.json.data[0].date}&id=${encodeId}`;
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
                .inspectBody();
          });
    });
  });
/*
  test('should fail to get availability times: Missing Date', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/api/v1/availability/times?id=${encodedId}`;
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


  test('should fail to get availability times: Missing ID', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/api/v1/availability/times?date=2021-02-02`;
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

  test('should fail to get availability times for bad data', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/api/v1/availability/times?date=2021-02-02&id=1`;
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
  });*/
});
