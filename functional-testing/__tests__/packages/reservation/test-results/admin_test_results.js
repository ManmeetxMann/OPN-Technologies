const frisby = require('frisby');
const tv4 = require('tv4');
const moment = require('moment');
const helpers_common = require('helpers_common');
//const admin_tags_data = require('enterprise/admin_tags_data');
const testProfile = require('test_profile');
const schemaDefinations = require('../appointments/webhook/node_modules/reservation/test_result').schemaDefinations;
const test_results_data = require('../appointments/webhook/node_modules/reservation/test_results');
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

describe('TestResultsController', () => {
    
    describe('/admin/api/v1/test-results:get', () => {
        test('TestResults', function () {
            return helpers_common.runAuthenticatedTest(frisby).then(function(token){

                const url = `${reservationServiceUrl}/reservation/admin/api/v1/test-results?organizationId=${organizationId}&dateOfAppointment=2020-12-07`
                console.log(url)
                return frisby
                    .setup({
                        request: {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        }
                    })
                    .get(url)
                    .expect('status', 200)
                    .expect('validateSchema')
                    .inspectBody() 
            })
        })
    })
    
   
    describe('test-results:post', () => {
       /*
        test("/reservation/admin/api/v1/test-results:post:success should be able to create test results Successfully", function () {
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
                        "from": "2020-12-06",
                        "to": "2020-12-08",
                        "resultDate": "2020-12-07",
                        "results": [
                            test_results_data.getData({"barCode":'A144','result':'Negative'}),
                        ]
                    }
                )
                .expect('status', 200)
                .inspectBody() 
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
    /*
    describe('post: /api/v1/send-and-save-test-results-bulk', () => {
       
        test("post: /api/v1/send-and-save-test-results-bulk should be able to create test results Successfully", function () {
            const url = `${reservationServiceUrl}/admin/api/v1/send-and-save-test-results-bulk`
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
                        "from": "2020-12-06",
                        "to": "2020-12-08",
                        "resultDate": "2020-12-07",
                        "results": [
                            test_results_data.getData({"barCode":'A144','result':'Positive'}),
                            test_results_data.getData({"barCode":'A144','result':'Positive'}),
                            test_results_data.getData({"barCode":'A144','result':'Negative'}),
                            test_results_data.getData({"barCode":'A144','result':'2019-nCoV Detected'})
                        ]
                    }
                )
                .expect('status', 200)
                .inspectBody() 
        })
    })

    describe('post: /admin/api/v1/send-and-save-test-results', () => {
       
        test("post: /admin/api/v1/send-and-save-test-results should be able to create negative test results Successfully", function () {
            const url = `${reservationServiceUrl}/admin/api/v1/send-and-save-test-results`
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
                    test_results_data.getData({"barCode":'A144','result':'Negative'})
                )
                .expect('status', 200)
                .inspectBody() 
        })

             
        test("post: /admin/api/v1/send-and-save-test-results should be able to create positive test results Successfully", function () {
            const url = `${reservationServiceUrl}/admin/api/v1/send-and-save-test-results`
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
                    test_results_data.getData({"barCode":'A144','result':'Positive'})
                )
                .expect('status', 200)
                .inspectBody() 
        })

             
        test("post: /admin/api/v1/send-and-save-test-results should be able to create 2019-nCoV Detected test results Successfully", function () {
            const url = `${reservationServiceUrl}/admin/api/v1/send-and-save-test-results`
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
                    test_results_data.getData({"barCode":'A144','result':'2019-nCoV Detected'})
                )
                .expect('status', 200)
                .inspectBody() 
        })

    })

    describe('post: /admin/api/v1/send-and-save-test-results', () => {
        
    })
    */

})

