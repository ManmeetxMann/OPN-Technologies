import frisby from 'frisby';
import helpersCommon from '../../../helpers/helpers_common';
import testProfile from '../../../test_data/test_profile'

// Do setup first
frisby.globalSetup({
    request: {
        headers: helpersCommon.headers()
    }
});

const passportServiceUrl = process.env.PASSPORT_SERVICE_URL
const locationId = testProfile.get().locationId
const userId = testProfile.get().userId

/**
 * @group passport-service
 * @group /passport/user/status/update
 * @group create-attestation
 */
describe('post:passport: /user/status/update', () => {
    test('Succcessfully Save Attestation and Create new Passport with Proceed Pass', async () => {
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
            expect(data.json.data.passport.status).toBe('proceed')
    })

    test('Succcessfully Save Attestation and Create new Passport with Caution', async () => {
        const url = `${passportServiceUrl}/user/status/update`
        const data = await frisby
            .post(
                url,
                {
                    "locationId": locationId,
                    "answers": {
                        "1": {
                            "1": true
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
            expect(data.json.data.passport.status).toBe('caution')
    })

    test('Succcessfully Save Attestation and Create new Passport with stop', async () => {
        const url = `${passportServiceUrl}/user/status/update`
        const data = await frisby
            .post(
                url,
                {
                    "locationId": locationId,
                    "answers": {
                        "1": {
                            "1": true
                        },
                        "2": {
                            "1": false
                        },
                        "3": {
                            "1": true
                        },
                        "4": {
                            "1": true,
                            "2": "2020-06-10T05:05:32.217Z"
                        }
                    },
                    "userId": userId,
                    "includeGuardian": true,
                    "dependantIds": []
                }
            )
            expect(data.status).toEqual(200)
            expect(data.json.data.passport.status).toBe('stop')
    })
})