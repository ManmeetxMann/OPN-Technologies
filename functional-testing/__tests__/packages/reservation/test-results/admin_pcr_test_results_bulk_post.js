const frisby = require('frisby');
const helpersCommon = require('helpers_common');
const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;


// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});


/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/pcr-test-results
 * @group send-bulk-test-results
 */
describe('PCR Bulk TestResultsController', () => {
  test('/reservation/admin/api/v1/pcr-test-results:post:success should be able to create PCR test results Successfully', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results-bulk`;
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
                    'autoResult': 'Negative',
                    'action': 'SendThisResult',
                    'barCode': 'A1509',
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
                      }
                    ],
                    'notify': true,
                    'comment': 'AWESOM',
                  },
                ],
              },
          )
          .expect('status', 200)
          .inspectBody();
    });
  });
});
