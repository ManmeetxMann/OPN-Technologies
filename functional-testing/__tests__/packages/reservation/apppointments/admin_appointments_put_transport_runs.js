const frisby = require('frisby');
const helpersCommon = require('helpers_common');

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;
/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/appointments/add-transport-run
 * @group put-appointments-add-transport-run
 */
describe('PUT:admin:add transport run', () => {
  test('Add Transport Run to Appoinment success?', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/appointments/add-transport-run`;
      return frisby
          .setup({
            request: {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            },
          })
          .put(
              url,
              {
                'transportRunId': 'TRA1236-Mar15',
                'appointmentIds': ['3daig0cwDK51XReWFT55'],
              },
          )
          .expect('status', 200)
          .inspectBody();
    });
  });

  /*
    test('Add Transport Run to Appoinment fail. Invalid Run ID?', function () {
        return helpers_common.runAuthenticatedTest(frisby).then(function(token){

            const url = `${reservationServiceUrl}/reservation/admin/api/v1/appointments/add-transport-run`
            return frisby
                .setup({
                    request: {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                })
                .put(
                    url,
                    {
                        "transportRunId":"R10271",
                        "appointmentIds":['6dP06hdJB19ynKe2rVzr','9zookhIPSCyKpCG39Ok1']
                    }
                )
                .expect('status', 404)
                .inspectBody()
        })
    })

    test('Add Transport Run to Appoinment fail missing data?', function () {
        return helpers_common.runAuthenticatedTest(frisby).then(function(token){

            const url = `${reservationServiceUrl}/reservation/admin/api/v1/appointments/add-transport-run`
            return frisby
                .setup({
                    request: {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                })
                .put(
                    url,
                    {
                    }
                )
                .expect('status', 400)
                .inspectBody()
        })
    })
    */
});

