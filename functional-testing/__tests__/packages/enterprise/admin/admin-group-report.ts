import frisby from 'frisby'
import helpersCommon from '../../../../helpers/helpers_common'
import testProfile from '../../../../test_data/test_profile'

// Do setup first
frisby.globalSetup({
    request: {
        headers: helpersCommon.headers(),
    },
});
const serviceUrl = process.env.ACCESS_SERVICE_URL
const enterPriseServiceUrl = process.env.ENTERPRISE_SERVICE_URL
jest.setTimeout(30000);
const organizationId = testProfile.get().organizationId
/**
 * @group enterprise-service
 * @group /enterprise/stats/group-report
 * @group stats-group-report
 */
describe('Get admin-stats-v2', () => {
    test('able to successfully enter users', () => {
        return helpersCommon.runAuthenticatedTest(frisby).then(function (token) {
            const url = `${enterPriseServiceUrl}/organizations/${organizationId}/stats/group-report?groupId=67Ax1Z9Z9HjXurZLaMR0`;
            return frisby
                .setup({
                    request: {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    },
                })
                .get(url)
                .inspectBody()
                .expect('status', 200);
        })
    })


})
