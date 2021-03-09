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
 * @group send-single-test-results
 */
describe('PCR TestResultsController', () => {
  test('Should be able to create PCR test results Successfully', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results`;
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
                'famEGene': '-',
                'famCt': 'N/A',
                'calRed61RdRpGene': '-',
                'calRed61Ct': 'N/A',
                'quasar670NGene': '-',
                'quasar670Ct': 'N/A',
                'hexIC': '-',
                'hexCt': '36',
                'barCode': 'A1423',
                'resultDate': '2021-01-25',
                'autoResult': 'Invalid',
                'notify': false,
                'action': 'ReRunToday',
                'sendUpdatedResults': false,
              },
          )
          .expect('status', 200)
          .inspectBody();
    });
  });
});

/*

RecollectAsInvalid,
RecollectAsInconclusive,
SendThisResult,
DoNothing,
ReRunToday,
ReRunTomorrow,
MarkAsPositive,
MarkAsNegative,
SendPreliminaryPositive
*/
