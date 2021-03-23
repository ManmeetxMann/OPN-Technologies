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
                'action': 'SendThisResult',
                'autoResult': 'Negative',
                'barCode': 'TEST10000548',
                // 'comment': 'AWESOM',
                'labId': 'maZSoqhfaidWg2ysjZHh',
                'templateId': 'template2',
                'notify': true,
                'resultAnalysis': [
                  {
                    'label': 'IgA',
                    'value': '1',
                  },
                  {
                    'label': 'IgG',
                    'value': '2',
                  },
                  {
                    'label': 'IgM',
                    'value': '3',
                  },
                  {
                    'label': 'profileR1',
                    'value': '4',
                  },
                  {
                    'label': 'profileR2',
                    'value': '5',
                  },
                  {
                    'label': 'profileR3',
                    'value': '6',
                  }],
                'resultDate': todaysDate,
                'sendUpdatedResults': true,
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
