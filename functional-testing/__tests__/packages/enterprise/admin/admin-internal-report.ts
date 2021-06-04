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
 * @group /enterprise/internal/group-report 
 * @group admin-internal-report
 * @group admin-user
 */
describe('Get Admin Stats', () => {
    test('able to successfully get stats', async () => {
        const token = await helpersCommon.runAuthenticatedTest(frisby)
        const url = `${serviceUrl}/internal/group-report`;
        const response = await frisby
            .setup({
                request: {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'timeout': 30000,
                    },
                },
            })
            .post(url,{//TODO: Make Dynamic
              organizationId: "OhvmJymrhQAY9VsxplEw",
              from: "2021-05-05T00:00:00.000Z",
              email: "mary+craigleith4@stayopn.com",
              name: "Marycraig4u Ios",
              to: "2021-06-04T03:59:59.999Z",
              groupId: "Vn61FXaGjtMuDNECSGsX",
              })
            .inspectBody()
        expect(response.status).toEqual(200)
    })

})
