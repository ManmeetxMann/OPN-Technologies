const frisby = require('frisby');
const moment = require('moment');
const helpersCommon = require('helpers_common');
const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;
const todaysDate = moment(new Date()).format('YYYY-MM-DD');

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
                'resultDate': todaysDate,
                'labId': 'k0qbPDqTwqitKUwlGHye',
                'templateId': 'template1',
                'fileName': 'fileName',
                'results': [
                  {
                    'action': 'SendThisResult',
                    'autoResult': 'Negative',
                    'barCode': 'A1423',
                    // 'comment': 'AWESOM',
                    'notify': true,
                    'resultAnalysis': [
                      {
                        'label': 'LBL1',
                        'value': '1',
                      },
                      {
                        'label': 'LBL1',
                        'value': '2',
                      },
                      {
                        'label': 'LBL2',
                        'value': '3',
                      },
                      {
                        'label': 'LBL3',
                        'value': '4',
                      },
                      {
                        'label': 'LBL4',
                        'value': '5',
                      },
                      {
                        'label': 'LBL4',
                        'value': '6',
                      },
                      {
                        'label': 'LBL4',
                        'value': '7',
                      },
                      {
                        'label': 'LBL4',
                        'value': '8',
                      }],
                    'sendUpdatedResults': true,
                  },
                ],
              },
          )
          .expect('status', 200)
          .inspectBody();
    });
  });
});
