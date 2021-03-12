const frisby = require('frisby');
const helpersCommon = require('helpers_common');
const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;
const todaysDate = moment(new Date()).format("YYYY-MM-DD")

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});


/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/test-results-bulk
 * @group send-bulk-test-results
 */
describe('PCR Bulk TestResultsController', () => {
  test('Should be able to create PCR test results Successfully', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/test-results-bulk`;
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
                'resultDate': '2021-02-10',
                'results': [
                  {
                    'action': 'SendThisResult',
                    'autoResult': 'Negative',
                    'barCode': 'A1423',
                    //'comment': 'AWESOM',
                    'notify': true,
                    'resultAnalysis':[
                      {
                        'label':'LBL1',
                        'value':'26'
                      },
                      {
                        'label':'LBL2',
                        'value':'26'
                      },
                      {
                        'label':'LBL3',
                        'value':'26'
                      },
                      {
                        'label':'LBL4',
                        'value':'26'
                      }],
                    'resultDate': todaysDate,
                    'sendUpdatedResults': false,
                  },
                ],
              },
          )
          .expect('status', 200)
          .inspectBody();
    });
  });
});
