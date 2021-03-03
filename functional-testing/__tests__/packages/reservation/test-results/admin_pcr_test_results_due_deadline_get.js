const frisby = require('frisby');
const Joi = frisby.Joi
const helpers_common = require('helpers_common');

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
        const schema = Joi.object({
            data: Joi.array().items(
                Joi.object({
                    id: Joi.string().required(),
                    barCode: Joi.string().required(),
                    deadline: Joi.date().iso().required(),
                    status: Joi.string().required(),
                    testRunId: Joi.string().optional(),
                    dateTime: Joi.date().iso().required(),
                    vialLocation: Joi.string().optional(), 
                    runNumber: Joi.string().required(), 
                    reCollectNumber: Joi.string().required(), 
                })
            ),
            status: Joi.object({
                code: Joi.string().required(),
                message: Joi.string().allow(null)
            }),
            page: Joi.number().required()
        })
        //console.log(response.json)
        const {validatedData,error} = schema.validate(response.json)
		expect(error).toBe(null);
	});
});

/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/pcr-test-results/due-deadline
 * @group get-due-deadline-pcr-test-results
 */
describe('Get: /reservation/admin/api/v1/pcr-test-results', () => {
    
    test('Get PCR Results Due Today should fail for missing deadline', function () {

        return helpers_common.runAuthenticatedTest(frisby).then(function(token){

            const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results/due-deadline?organizationId=${organizationId}`
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
                .expect('status', 400)
        })
    })
    
    test('Get TestResults Due Today by Deadline Only for Lab Results', function () {
        return helpers_common.runAuthenticatedTest(frisby).then(function(token){

            const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results/due-deadline?deadline=2021-02-11`
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
                .inspectBody() 
                .expect('validateSchema')
        })
    })
    
    test('Get TestResults Due Today by Barcodes for Lab Results', function () {
        return helpers_common.runAuthenticatedTest(frisby).then(function(token){

            const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results/due-deadline?barCode=A1254`
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
                .inspectBody() 
                .expect('validateSchema')
        })
    })


    test('Get TestResults Due Today by TestRUnId for Lab Results', function () {
        return helpers_common.runAuthenticatedTest(frisby).then(function(token){

            const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results/due-deadline?testRunId=2021-01-18`
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
                .inspectBody() 
                .expect('validateSchema')
        })
    })
})