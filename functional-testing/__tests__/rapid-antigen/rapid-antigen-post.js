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
 * @group /reservation/admin/api/v1/rapid-antigen-test-results
 * @group rapid-antigen-create
 */
describe('post:temperature', () => {
    test('create stop passport by submitting temperature.',  () => {
        return helpers_common.runAuthenticatedTest(frisby).then(function(token){
            const url = `${reservationServiceUrl}/reservation/admin/api/v1/rapid-antigen-test-results`
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
                        [
                            {
                                "appointmentID": 'PcCFDchvWyBCVnXMyGNk',
                                "action": 'DoNothing'
                            },
                            {
                                "appointmentID": 'cJXQ6JFKntMEuF33F7oG',
                                "action": 'SendNegative'//DoNothing, SendInconclusive, SendNegative, SendPositive
                            }
                        ]
                    )
                    .inspectBody()
                    .expect('status', 200)
        })
    })
})
