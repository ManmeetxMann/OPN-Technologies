import frisby from 'frisby'
import helpersCommon from '../../../helpers/helpers_common'
import testProfile from '../../../test_data/test_profile'

// Do setup first
frisby.globalSetup({
	request: {
		headers:  helpersCommon.headers()
	}
});

const registryServiceUrl = process.env.REGISTRY_SERVICE_URL
const organizationId = testProfile.get().organizationId
const userId = testProfile.get().userId
const groupId = testProfile.get().groupId
/**
 * @group passport-service
 * @group /passport/user/status/update
 * @group legacy-dependant-controller
 */
describe('Legacy Dependant Controller', () => {

    test('Should return list of dependents',  () => {
        const url = `${registryServiceUrl}/v2/users/${userId}/dependants`
        return frisby
            .get(
                url
            )
            .inspectBody()
            .expect('status', 200)
    })

    test('Should be able to create Dependant',  () => {
        const url = `${registryServiceUrl}/v2/users/${userId}/dependants`
        const firstNameData = `FRISBY_JS_${Date.now()}`
        const depandantData = [
            {
                "firstName": firstNameData,
                "lastName": `${groupId}_LAST1`,
                "groupId": groupId
            }
        ]
        return frisby
            .post(
                url,
                {
                    "organizationId": organizationId,
                    "dependants": depandantData
                }
            )
            .expect('status', 200)
    })

    /*
    describe('get and post:dependent', () => {
        test('Should create ane get dependent list successfully.',  () => {
            const url = `${registryServiceUrl}/v2/users/${userId}/dependants`
            const firstNameData = `FRISBY_JS_${Date.now()}`
            const depandantData = [
                {
                    "firstName": firstNameData,
                    "lastName": "DIRECT_LAST1",
                    "groupId": groupId
                }
            ]
            return frisby
                    .post(
                        url,
                        {
                            "organizationId": organizationId,
                            "dependants": depandantData
                        }
                    ).then(()=>{
                        return frisby
                            .get(
                                url
                            )
                            .inspectBody()
                            .expect('status', 200)
                            .then((response)=>{
                                expect(response.json.data.some(({firstName}) => firstName === firstNameData)).toBe(true);
                            })
                    })
        })
    })

    
    describe('put:dependent', () => {
        test('should update new dependent successfully.',  () => {
            return helpers_common.runAuthenticatedTest(frisby).then(function(token){
                const url = `${registryServiceUrl}/v2/users/${userId}/dependants`
                const firstNameData = `UNIQ${Date.now()}`
                return frisby
                    .post(
                        url,
                        {
                            "organizationId": organizationId,
                            "dependants": [
                              {
                                "id":"4mVNY3MQXYaTDreQJthR",
                                "firstName": "DIRECT_FIRST3_UPDATE",
                                "lastName": "DIRECT_LAST3_UPDATE",
                                "groupId": groupId
                              }
                            ]
                        }
                    )
                    .inspectBody()
                    .expect('status', 200)
            })
        })
    })

    
    describe('delete:dependent', () => {
        test('should delete dependent successfully.',  () => {
            const url = `${registryServiceUrl}/v2/users/${userId}/dependants`
            return frisby
                    .get(
                        url
                    )
                    .then((response)=>{
                        const dependants = response.json.data
                        return frisby
                            .delete(
                                url,
                                {
                                    "organizationId": organizationId,
                                    "dependants":dependants
                                }
                            )
                            .inspectBody()
                            .expect('status', 200)
                    })
            
            
        })
    })
    */
})