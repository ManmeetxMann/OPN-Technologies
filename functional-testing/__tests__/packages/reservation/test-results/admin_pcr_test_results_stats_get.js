const frisby = require('frisby');
const helpers_common = require('helpers_common');
const testProfile = require('test_profile');

// Do setup first
frisby.globalSetup({
	request: {
		headers:  helpers_common.headers()
	}
});

const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL
const organizationId = testProfile.get().organizationId
/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/appointments
 * @group get-pcr-test-results-stats
 */

describe('PCR test results stats', () => {
    
    test('Get PCR test results stats successfullly?', function () {
        return helpers_common.runAuthenticatedTest(frisby).then(function(token){

            const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results/stats?deadline=2021-02-22`
            return frisby
                .setup({
                    request: {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                })
                .get(
                    url
                )
                .expect('status', 200)
                .inspectBody()
        })
    })
})
