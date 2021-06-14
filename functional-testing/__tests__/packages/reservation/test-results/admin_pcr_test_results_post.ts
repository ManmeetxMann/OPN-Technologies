import frisby from 'frisby';
import helpersCommon from '../../../../helpers/helpers_common';
import moment from 'moment';

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL

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
                "action": "RecollectAsInconclusive",
                "autoResult": "Negative",
                "barCode": "TEST10000000381",
                "notify": true,
                "sendUpdatedResults": true,
                "labId": "CINkotCuHoZSLDN9wYjQ",
                "templateId": "PCR-1",
                "resultAnalysis": [{
                  "label": "famEGene",
                  "value": "3"
                }, {
                  "label": "calRedRdrp",
                  "value": "4"
                }, {
                  "label": "quasarNgene",
                  "value": "4"
                }, {
                  "label": "hexIc",
                  "value": "5"
                }, {
                  "label": "famCt",
                  "value": "5"
                }, {
                  "label": "calRedCt",
                  "value": "5"
                }, {
                  "label": "quasarCt",
                  "value": "5"
                }, {
                  "label": "hexCt",
                  "value": "5"
                }],
                "resultDate": todaysDate
              }
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


/*

{
                'action': 'SendThisResult',
                'autoResult': 'Positive',//PresumptivePositive
                'barCode': 'TEST10000000380',
                // 'comment': 'AWESOM',
                'labId': 'CINkotCuHoZSLDN9wYjQ',
                'templateId': 'template1',
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
                    'label': 'IgAResult',
                    'value': '',
                  },
                  {
                    'label': 'IgGResult',
                    'value': 'Positive',
                  },
                  {
                    'label': 'IgMResult',
                    'value': 'Indeterminate',
                  }],
                'resultDate': todaysDate,
                'sendUpdatedResults': true,
              }
              */