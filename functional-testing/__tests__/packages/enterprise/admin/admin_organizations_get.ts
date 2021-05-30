import frisby from 'frisby';
import helpersCommon from '../../../../helpers/helpers_common'

// Do setup first
frisby.globalSetup({
    request: {
        headers: helpersCommon.headers(),
    },
});

const enterpriseServiceUrl = process.env.ENTERPRISE_SERVICE_URL;

/**
 * @group enterprise-service
 * @group /organizations​/one
 * @group get-organizations​
 * @group admin
 */
describe('admin:organizations', () => {
    test('get organizations', async () => {
        const url = `${enterpriseServiceUrl}/organizations/one?id=TESTPROD1`
        const data = await frisby.get(url)
        expect(data.status).toEqual(200)
    })
})
