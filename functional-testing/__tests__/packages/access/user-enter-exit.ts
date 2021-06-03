import frisby from 'frisby'
import helpersCommon from '../../../helpers/helpers_common'
import testProfile from '../../../test_data/test_profile'

// Do setup first
frisby.globalSetup({
    request: {
        headers: helpersCommon.headers()
    }
});

const accessServiceUrl = process.env.ACCESS_SERVICE_URL
const passportServiceUrl = process.env.PASSPORT_SERVICE_URL

const organizationId = testProfile.get().organizationId
const locationId = testProfile.get().locationId
const userId = testProfile.get().userId

const createPassportAndStatusToken = async () => {
    const url = `${passportServiceUrl}/user/status/update`
    const data = await frisby
        .post(
            url,
            {
                "locationId": locationId,
                "answers": {
                    "1": {
                        "1": false
                    },
                    "2": {
                        "1": false
                    },
                    "3": {
                        "1": false
                    },
                    "4": {
                        "1": false,
                        "2": "2020-06-10T05:05:32.217Z"
                    }
                },
                "userId": userId,
                "includeGuardian": true,
                "dependantIds": []
            }
        )

    expect(data.status).toEqual(200)
    expect(data.json.data.status).toBe('proceed')
    return data.json.data
}
/**
 * @group access-service
 * @group /access/user/createToken
 * @group access-controller
 */
describe('Access Controller', () => {
    test('Succcessfully Enter Exit using new Passport', async () => {
        const passport = await createPassportAndStatusToken()
        const createTokenUrl = `${accessServiceUrl}/user/createToken`
        const accessData = await frisby
            .post(
                createTokenUrl,
                {
                    "statusToken": passport.statusToken,
                    "locationId": locationId,
                    "userId": userId,
                    "includeGuardian": true,
                    "dependantIds": [
                    ]
                }
            )
        const accessToken = accessData.json.data.token
        expect(accessData.status).toEqual(200)
        expect(accessToken).not.toBeNull()

        const accessEnterUrl = `${accessServiceUrl}/user/enter`
        const accessEnterData = await frisby
            .post(
                accessEnterUrl,
                {
                    "organizationId": organizationId,
                    "locationId": locationId,
                    "accessToken": accessToken
                }
            )
        expect(accessEnterData.status).toEqual(200)


        const accessExitUrl = `${accessServiceUrl}/user/exit`
        const accessExitData = await frisby
            .post(
                accessExitUrl,
                {
                    "organizationId": organizationId,
                    "locationId": locationId,
                    "accessToken": accessToken
                }
            )
        expect(accessExitData.status).toEqual(200)

    })

    /*
    test('Succcessfully Created Checkin.',  () => {
        const url = `${accessServiceUrl}/user/enter`
        return frisby
            .post(
                url,
                {
                    "organizationId": organizationId,
                    "locationId": locationId,
                    "accessToken": "m5MhEjRVh4U95zZvLdWlHQ7W6Xs="
                }
            )
            .inspectBody()
            .expect('status', 200)
    })*/
})