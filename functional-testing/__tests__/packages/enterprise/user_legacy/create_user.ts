import frisby from 'frisby';
import helpersCommon from '../../../../helpers/helpers_common'
import testProfile from '../../../../test_data/test_profile'
import faker from 'faker';

// Do setup first
frisby.globalSetup({
    request: {
        headers: helpersCommon.headers()
    }
});

const enterpriseServiceUrl = process.env.ENTERPRISE_SERVICE_URL
const organizationId = testProfile.get().organizationId
//const userId = testProfile.get().userId
//const email = testProfile.get().email

const firstName = faker.name.firstName()
const lastName = faker.name.lastName()
const email = faker.internet.email()
/**
 * @group enterprise-service
 * @group /user/connect/v2/add
 * @group legacy-user-add
 * @group reg-user
 */

describe('user:create', () => {

    test('Create Anonymous User V2', async () => {
        const url = `${enterpriseServiceUrl}/user/connect/v2/add`
        await frisby
            .post(
                url,
                {
                    organizationId: organizationId,
                    registrationId: '',
                    firstName: firstName,
                    lastName: firstName,
                    base64Photo: `https://picsum.photos/200?${Date.now()}`,
                    groupId: testProfile.get().groupId,
                }
            )
            .expect('status', 200)
        //.inspectBody()
    })

    test('Create Anonymous User', async () => {
        const url = `${enterpriseServiceUrl}/user/connect/add`
        await frisby
            .post(
                url,
                {
                    organizationId: organizationId,
                    registrationId: '',
                    firstName: firstName,
                    lastName: firstName,
                    base64Photo: `https://picsum.photos/200?${Date.now()}`,
                    groupId: testProfile.get().groupId,
                }
            )
            .expect('status', 200)
        //.inspectBody()
    })

    test('should create new user and associate to auth', async () => {
        const token = await helpersCommon.getAuthToken(frisby, email, `${firstName} ${lastName}`)
        const url = `${enterpriseServiceUrl}/user/connect/v2/add`
        await frisby
            .post(
                url,
                {
                    idToken: token,
                    organizationId: organizationId,
                    registrationId: '',
                    firstName: firstName,
                    lastName: lastName,
                    base64Photo: `https://picsum.photos/200?${Date.now()}`,
                    groupId: testProfile.get().groupId,
                }
            )
            .expect('status', 200)
        //.inspectBody()  
        const data = await frisby
            .setup({
                request: {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            })
            .get(
                `${enterpriseServiceUrl}/enterprise/api/v3/users/self`
            )
        expect(data.status).toEqual(200)
        expect(data.json.data.firstName).toEqual(firstName)
    })
})
