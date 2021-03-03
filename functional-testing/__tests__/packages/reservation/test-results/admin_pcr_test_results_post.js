const frisby = require('frisby');
const tv4 = require('tv4');
const moment = require('moment');
const helpers_common = require('helpers_common');
//const admin_tags_data = require('enterprise/admin_tags_data');
const testProfile = require('test_profile');
const schemaDefinations = require('reservation/test_result').schemaDefinations;
const test_results_data = require('reservation/test_results');
const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL
//const timeZone = process.env.DEFAULT_TIME_ZONE
const organizationId = testProfile.get().organizationId

// Do setup first
frisby.globalSetup({
	request: {
		headers:  helpers_common.headers()
	}
});

beforeAll(function () {
	// Add our custom expect handler
	frisby.addExpectHandler('validateSchema', function (response) {
		let jsonData = response.json;
		var schema = {"$ref": "TestResultList" } ;

		tv4.addSchema('schema', schema);
		tv4.addSchema('TestResultList', schemaDefinations.$TestResultList);
		tv4.addSchema('TestResultResponse', schemaDefinations.$TestResultResponse);
		tv4.addSchema('OPNStatus', schemaDefinations.$OPNStatus);

		var validation = tv4.validateMultiple(jsonData, schema, true, true); 
		console.log(validation);

		if (!validation.valid) { 
			console.log("Schema Validation failed"); 
			var i;
			for (i = 0; i < validation.errors.length; i++) { 
				console.log("param:" + validation.errors[i].dataPath + ", error:" + validation.errors[i].message);
			}
		}
		expect(validation["valid"]).toBe(true);
	});
});

/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/pcr-test-results
 * @group send-single-test-results
 */
describe('PCR TestResultsController', () => {
       
    test("Should be able to create PCR test results Successfully", function () {
        return helpers_common.runAuthenticatedTest(frisby).then(function(token){
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
                        "barCode":'A1423',
                        "resultDate": "2021-01-25",
                        'autoResult':'Invalid',
                        'notify': false,
                        'action': "ReRunToday",//RecollectAsInvalid, RecollectAsInconclusive, SendThisResult, DoNothing, ReRunToday, ReRunTomorrow, MarkAsPositive, MarkAsNegative, SendPreliminaryPositive
                        "sendUpdatedResults": false
                    }
                )
                .expect('status', 200)
                .inspectBody() 
        })
    })

    /*   
    test("Should fail for invalid BarCode.", function () {
        return helpers_common.runAuthenticatedTest(frisby).then(function(token){
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
        return helpers_common.runAuthenticatedTest(frisby).then(function(token){
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
})