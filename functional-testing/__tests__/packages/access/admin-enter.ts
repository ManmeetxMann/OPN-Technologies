import frisby from 'frisby'
import helpersCommon from '../../../helpers/helpers_common'
import testProfile from '../../../test_data/test_profile'

// Do setup first
frisby.globalSetup({
    request: {
        headers: helpersCommon.headers(),
    },
});
const serviceUrl = process.env.ACCESS_SERVICE_URL
jest.setTimeout(30000);
const organizationId = testProfile.get().organizationId
/**
 * @group reservation-service
 * @group /access/admin/enter
 * @group access-admin-enter
 */
describe('Get admin-stats-v2', () => {
    test('able to successfully enter users', () => {
        return helpersCommon.runAuthenticatedTest(frisby).then(function (token) {
            const url = `${serviceUrl}/admin/enter`;
            return frisby
                .setup({
                    request: {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    },
                })
                .post(url, { 
                    "accessToken": "7Ggu3pIr1K6Olf1UYCIT05ZceTs=", 
                    "userId": "edgMD7TD53COrk0oVqDo" 
                })
                .inspectBody()
                .expect('status', 200);
        })
    })


})
