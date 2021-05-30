const frisby = require('frisby');
const helpers_common = require('helpers_common');
const admin_tags_data = require('enterprise/admin_tags_data');
const testProfile = require('test_profile');

// Do setup first
frisby.globalSetup({
	request: {
		headers:  helpers_common.headers()
	}
});

const enterpriseServiceUrl = process.env.ENTERPRISE_SERVICE_URL
const organizationId = testProfile.get().organizationId
const userId = testProfile.get().userId
const email = testProfile.get().email
describe('UserController', () => {
    
    /*
    describe('auth:confirmation', () => {
        test('should return success for auth confirmation',  () => {
            return helpers_common.runAuthenticatedTest(frisby).then(function(token){
                const url = `${enterpriseServiceUrl}/enterprise/api/v3/users/auth/confirmation`
                return frisby
                    .post(
                        url,
                        {
                            "organizationId": organizationId,
                            "idToken": token,
                            "userId":"fINiDUYV1abpILwRxQ1D"     
                        }
                    )
                    .expect('status', 200)
                    .inspectBody()
            })
        })
    })
   */
    
    describe('post:/enterprise/api/v3/users/auth/short-code', () => {
        
        /*
        test('short Code returned successfully?',  () => {
            const url = `${enterpriseServiceUrl}/enterprise/api/v3/users/auth/short-code`
            return frisby
                .post(
                    url,
                    {
                        "email": email,
                        "shortCode": 'W3ESR2'         
                    }
                )
                .expect('status', 200)
                .inspectBody()
        })
        test('validate for incorrect code',  () => {
            const url = `${enterpriseServiceUrl}/enterprise/api/v3/users/auth/short-code`
            return frisby
                .post(
                    url,
                    {
                        "organizationId": organizationId,
                        "email": email,
                        "shortCode": '0A5HCL1'         
                    }
                )
                .expect('status', 400); 
        })
        
        test('fail for missing organizationId?',  () => {
            const url = `${enterpriseServiceUrl}/enterprise/api/v3/users/auth/short-code`
            return frisby
                .post(
                    url,
                    {
                        "email": email,
                        "shortCode": '0A5HCL1'         
                    }
                )
                .expect('status', 400); 
        })
        
        test('fail for missing email?',  () => {
            const url = `${enterpriseServiceUrl}/enterprise/api/v3/users/auth/short-code`
            return frisby
                .post(
                    url,
                    {
                        "organizationId": organizationId,
                        "shortCode": '0A5HCL1'         
                    }
                )
                .expect('status', 400); 
        })
        
        test('fail for missing shortCode?',  () => {
            const url = `${enterpriseServiceUrl}/enterprise/api/v3/users/auth/short-code`
            return frisby
                .post(
                    url,
                    {
                        "organizationId": organizationId,
                        "email": email         
                    }
                )
                .expect('status', 400); 
        })
        */
    })

    /*
    describe('user:/user/connect/', () => {
        test('User Connect',  () => {
            const url = `${enterpriseServiceUrl}/user/connect/${organizationId}/users/${userId}`
            return frisby
                .get(
                    url
                )
                .inspectBody()
                .expect('status', 200);
        })
    })


    describe('get: user data for ORG', () => {
        test('Get User data for ORG is success',  () => {
            const url = `${enterpriseServiceUrl}/user/connect/${organizationId}/users/${userId}`
            return frisby
                .get(
                    url
                )
                .inspectBody()
                .expect('status', 200);
        })
    })
   

    describe('GET: /enterprise/api/v3/users/self', () => {
        test('get my user successfuly?',  () => {
            return helpers_common.runAuthenticatedTest(frisby).then(function(token){
                const url = `${enterpriseServiceUrl}/enterprise/api/v3/users/self`
                return frisby
                    .setup({
                        request: {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        }
                    })
                    .get(
                        url
                    )
                    .expect('status', 200)
                    .inspectBody()
            })
        })
    })

    

    describe('GET: /enterprise/api/v3/users/self/organizations', () => {
        test('get my organization successfuly?',  () => {
            return helpers_common.runAuthenticatedTest(frisby).then(function(token){
                const url = `${enterpriseServiceUrl}/enterprise/api/v3/users/self/organizations`
                return frisby
                    .setup({
                        request: {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        }
                    })
                    .get(
                        url
                    )
                    .expect('status', 200)
                    .inspectBody()
            })
        })
    })

    describe('POST: /enterprise/api/v3/users/self/organizations', () => {
        test('connect my organization successfuly?',  () => {
            return helpers_common.runAuthenticatedTest(frisby).then(function(token){
                const url = `${enterpriseServiceUrl}/enterprise/api/v3/users/self/organizations`
                return frisby
                    .setup({
                        request: {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        }
                    })
                    .post(
                        url,
                        {
                            "organizationId": 'PPTEST'
                        }
                    )
                    .expect('status', 200)
                    .inspectBody()
            })
        })
    })

    describe('DELETE: /enterprise/api/v3/users/self/organizations', () => {
        test('disconnect my organization successfuly?',  () => {
            return helpers_common.runAuthenticatedTest(frisby).then(function(token){
                const url = `${enterpriseServiceUrl}/enterprise/api/v3/users/self/organizations/PPTEST`
                return frisby
                    .setup({
                        request: {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        }
                    })
                    .delete(
                        url
                    )
                    .expect('status', 200)
                    .inspectBody()
            })
        })
    })
    */
})