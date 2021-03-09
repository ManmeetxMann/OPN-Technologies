const frisby = require('frisby');
const helpersCommon = require('helpersCommon');
const testResultsData = require('reservation/test_results');
const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;


// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});


/**
 * @group reservation-service
 * @group /reservation/admin/api/v2/test-results-bulk
 * @group send-bulk-test-results
 */
describe('PCR Bulk TestResultsController', () => {
  test('Should be able to create PCR test results Successfully', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v2/test-results-bulk`;
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
                  testResultsData.getData({'barCode': 'A1313', 'autoResult': 'Negative', 'action': 'ReRunToday'}),
                  testResultsData.getData({'barCode': 'A1566', 'autoResult': 'Positive', 'action': 'ReRunTomorrow'}),
                  testResultsData.getData({'barCode': 'A1423', 'autoResult': 'Positive', 'action': 'SendThisResult'}),
                  testResultsData.getData({'barCode': 'A1560', 'autoResult': 'Positive', 'action': 'RecollectAsInconclusive'}),
                  {
                    'autoResult': 'Negative',
                    'action': 'SendThisResult',
                    'barCode': 'A1509',
                    'famEGene': '-',
                    'famCt': 'N/A',
                    'calRed61RdRpGene': '-',
                    'calRed61Ct': 'N/A',
                    'quasar670NGene': '-',
                    'quasar670Ct': 'N/A',
                    'hexIC': '-',
                    'hexCt': '36',
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
