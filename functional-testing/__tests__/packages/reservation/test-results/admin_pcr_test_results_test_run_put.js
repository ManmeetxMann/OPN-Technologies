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
 * @group /reservation/admin/api/v1/pcr-test-results/add-test-run
 * @group add-test-run-to-pcr-test-results
 */
describe('PUT:admin:add test run', () => {
    test('Add Transport Run to PCR Results success?', function () {
        return helpers_common.runAuthenticatedTest(frisby).then(function(token){

            const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results/add-test-run`
            return frisby
                .setup({
                    request: {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                })
                .put(
                    url,
                    {
                        "testRunId":"T210206-2",
                        "pcrTestResultIds":['FPuOftrNdC6j17NMtc4P']
                    }
                )
                .expect('status', 200)
                .inspectBody()
        })
    })
})