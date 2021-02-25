const frisby = require('frisby');
const helpers_common = require('helpers_common');
const admin_tags_data = require('enterprise/admin_tags_data');
const testProfile = require('test_profile');

// Do setup first
frisby.globalSetup({
	request: {
		headers:  helpers_common.headers()
	}
});
const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL

const organizationId = testProfile.get().organizationId
const userId = testProfile.get().userId
/**
 * @group reservation-service
 * @group /reservation/admin/api/v1/labs
 * @group create-lab
 */
describe('post:temperature', () => {

    test('should be successfull to create lab',  () => {
        const url = `${reservationServiceUrl}/reservation/admin/api/v1/labs`
        return helpers_common.runAuthenticatedTest(frisby).then(function(token){
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
                        "name": 'FRISBY_1'
                    }
                )
                .expect('status', 200)
        })
    })

    test('should fail to create lab: empty name',  () => {
        const url = `${reservationServiceUrl}/reservation/admin/api/v1/labs`
        return helpers_common.runAuthenticatedTest(frisby).then(function(token){
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
                        "name": ''
                    }
                )
                .expect('status', 400)
        })
    })

    test('should fail to create lab: missing name',  () => {
        const url = `${reservationServiceUrl}/reservation/admin/api/v1/labs`
        return helpers_common.runAuthenticatedTest(frisby).then(function(token){
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
                        
                    }
                )
                .expect('status', 400)
        })
    })

})
