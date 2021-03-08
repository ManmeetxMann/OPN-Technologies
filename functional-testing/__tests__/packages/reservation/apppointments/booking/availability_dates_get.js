const frisby = require('frisby');
const helpersCommon = require('helpers_common');
// const testProfile = require('test_profile');

const {getLocations} = require('./booking_locations_get');

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;
const encodedId = 'eyJhcHBvaW50bWVudFR5cGVJZCI6MTk0MjIwMTgsImNhbGVuZGFyVGltZXpvbmUiOiJBbWVyaWNhL1Rvcm9udG8iLCJjYWxlbmRhcklkIjo0NTcxMTAzfQ==';
/**
 * @group reservation-service
 * @group /reservation/api/v1/booking-locations
 * @group get-availability-dates
 */
describe('get:availability dates', () => {
  it('should get availability dates successfully?', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      getLocations(token)
          .then((response)=>{
            expect(response.json.data.length).toBeGreaterThan(0);
            if (response.json.data.length>0) {
              const url = `${reservationServiceUrl}/reservation/api/v1/availability/dates?year=2021&month=02&id=${response.json.data[0].id}`;
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
          });
    });
  });

  it('should fail to get availability dates: Missing Month', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/api/v1/availability/dates?year=2020&id=${encodedId}`;
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

  it('should fail to get availability dates: Missing Year', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/api/v1/availability/dates?month=12&id=${encodedId}`;
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

  it('should fail to get availability dates: Missing ID', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/api/v1/availability/dates?year=2020&month=12`;
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

  it('should fail to get availability dates for bad YEAR', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/api/v1/availability/dates?year=202232320&month=12&id=${encodedId}`;
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

  it('should fail to get availability dates for bad Month', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/api/v1/availability/dates?year=2021&month=16&id=${encodedId}`;
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

  it('should fail to get availability dates for bad ID', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/api/v1/availability/dates?year=2020&month=12&id=sdsdss`;
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
});