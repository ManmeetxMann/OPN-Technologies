const frisby = require('frisby');
const helpersCommon = require('helpersCommon');
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
                'action': 'ReRunToday', // RecollectAsInvalid, RecollectAsInconclusive, SendThisResult, DoNothing, ReRunToday, ReRunTomorrow, MarkAsPositive, MarkAsNegative, SendPreliminaryPositive
                'sendUpdatedResults': false,
              },
          )
          .expect('status', 200)
          .inspectBody();
    });
  });

  /*
    test("Should fail for invalid BarCode.", function () {
        return helpersCommon.runAuthenticatedTest(frisby).then(function(token){
            const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results`
            return frisby
                .setup({
                    request: {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                })
                .post(
                    url,
                    {
                        "famEGene": "-",
                        "famCt": "N/A",
                        "calRed61RdRpGene": "-",
                        "calRed61Ct": "N/A",
                        "quasar670NGene": "-",
                        "quasar670Ct": "N/A",
                        "hexIC": "-",
                        "hexCt": "36",
                        "barCode":'BAD_BAR_CODE',
                        "resultDate": "2021-01-05",
                        'autoResult':'Inconclusive',
                        'notify': true,
                        'action': "RequestReSample"
                    }
                )
                .expect('status', 404)
                .inspectBody()
        })
    })


    test("/reservation/admin/api/v1/pcr-test-results:post:success should be able to create PCR test results Successfully", function () {
        return helpersCommon.runAuthenticatedTest(frisby).then(function(token){
            const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results-bulk`
            return frisby
                .setup({
                    request: {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                })
                .post(
                    url,
                    {
                        "resultDate": "2021-01-05",
                        "results": [
                            test_results_data.getData({"barCode":'A853','autoResult':'Negative','action':'ReRunToday'}),
                            test_results_data.getData({"barCode":'A849','autoResult':'Positive','action':'ReRunTomorrow'}),
                            test_results_data.getData({"barCode":'A851','autoResult':'Positive','action':'RequestReSample'})
                        ]
                    }
                )
                .expect('status', 200)
                .inspectBody()
        })
    })

    test('no results should be returned if resultDate is older than 30 days?', function () {
        const resultDate = moment(new Date()).subtract(32, 'days').format('YYYY-MM-DD')

        const url = `${reservationServiceUrl}/reservation/admin/api/v1/test-results`
        return frisby
            .setup({
                request: {
                    headers: {
                        'Authorization': `Basic YWRtaW46alMhSDN0Iw==`
                    }
                }
            })
            .post(
                url,
                {
                    "from": "2020-11-01",
                    "to": "2020-12-07",
                    "resultDate": resultDate,
                    "results": [
                        test_results_data.getData({"barCode":'A144','result':'Positive'}),
                    ]
                }
            )
            .expect('status', 400)
            .inspectBody()
    })
    */
});
