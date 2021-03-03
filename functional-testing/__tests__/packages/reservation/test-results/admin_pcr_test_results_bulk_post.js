const frisby = require('frisby');
const helpersCommon = require('helpersCommon');
// const admin_tags_data = require('enterprise/admin_tags_data');
const testProfile = require('test_profile');
const test_results_data = require('reservation/test_results');
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
                  test_results_data.getData({'barCode': 'A1313', 'autoResult': 'Negative', 'action': 'ReRunToday'}),
                  test_results_data.getData({'barCode': 'A1566', 'autoResult': 'Positive', 'action': 'ReRunTomorrow'}),
                  test_results_data.getData({'barCode': 'A1423', 'autoResult': 'Positive', 'action': 'SendThisResult'}),
                  test_results_data.getData({'barCode': 'A1560', 'autoResult': 'Positive', 'action': 'RecollectAsInconclusive'}),
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
