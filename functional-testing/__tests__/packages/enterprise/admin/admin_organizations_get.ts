import frisby from 'frisby';
import helpersCommon from '../../../../helpers/helpers_common'

import testProfile from '../../../../test_data/test_profile';
// Do setup first
frisby.globalSetup({
    request: {
        headers: helpersCommon.headers(),
    },
});
const organizationId = testProfile.get().organizationId
const locationId = testProfile.get().locationId
const enterpriseServiceUrl = process.env.ENTERPRISE_SERVICE_URL;
/**
 * @group enterprise-service
 * @group /organizations/one      
 * @group get-organizations-locations      
 * @group admin
 */
 describe('admin:organizations', () => {
    test('get organizations', async () => {
        const url = `${enterpriseServiceUrl}/organizations/one?id=${organizationId}`      
        const data = await frisby.get(url)
        expect(data.status).toEqual(200)
    })

    test('get organization locations', async () => {
        const url = `${enterpriseServiceUrl}/organizations/${organizationId}/locations`      
        const data = await frisby.get(url)
        expect(data.status).toEqual(200)
    })

    test('get organization locations by id', async () => {
        const url = `${enterpriseServiceUrl}/organizations/${organizationId}/locations/${locationId}`      
        const data = await frisby.get(url)
        expect(data.status).toEqual(200)
    })

    test('get organization public groups', async () => {
        const url = `${enterpriseServiceUrl}/organizations/${organizationId}/groups/public`
        const data = await frisby.get(url)
        expect(data.status).toEqual(200)
    })

    test('get organization config', async () => {
        const url = `${enterpriseServiceUrl}/organizations/${organizationId}/config`
        const data = await frisby.get(url)
        expect(data.status).toEqual(200)
    })
})
