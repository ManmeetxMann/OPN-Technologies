import frisby from 'frisby';
import helpersCommon from '../../../../helpers/helpers_common'
import testProfile from '../../../../test_data/test_profile';

// Do setup first
frisby.globalSetup({
    request: {
        headers: helpersCommon.headers(),
        'timeout': 30000,
    },
});
jest.setTimeout(30000);
const serviceUrl = process.env.ENTERPRISE_SERVICE_URL;
const organizationId = testProfile.get().organizationId

/**
 * @group enterprise-service
 * @group /access/api/v1/admin/stats/v2
 * @group admin-stats
 * @group admin-user
 */
describe('Get Admin Stats', () => {
    test('able to successfully get stats', async () => {
        const token = await helpersCommon.runAuthenticatedTest(frisby)
        const url = `${serviceUrl}/organizations/${organizationId}/stats`;
        const response = await frisby
            .setup({
                request: {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'timeout': 30000,
                    },
                },
            })
            .get(url)
        //.inspectBody()
        expect(response.status).toEqual(200)
    })
})
