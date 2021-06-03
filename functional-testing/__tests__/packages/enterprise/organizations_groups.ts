import frisby from 'frisby';
import helpersCommon from '../../../helpers/helpers_common'
import testProfile from '../../../test_data/test_profile';
const organization_group_data = require('enterprise/organization_group_data');
// Do setup first
frisby.globalSetup({
    request: {
        headers: helpersCommon.headers()
    }
});

const enterpriseServiceUrl = process.env.ENTERPRISE_SERVICE_URL
const organizationId = testProfile.get().organizationId
const groupName = testProfile.get().groupName
const groupId = testProfile.get().groupId
/**
 * @group enterprise-service
 * @group /enterprise/admin/api/v1/organizations      
 * @group create-group     
 * @group public-call
 */
describe('admin:organization:groups', () => {
    /*
    describe('group:list', () => {
        test('Successfully able to get list of Groups?', function () {
            return helpers_common.runAuthenticatedTest(frisby).then(function(token){

                const url = `${enterpriseServiceUrl}/organizations/${organizationId}/groups`
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
    */
    describe('group:create', () => {
        test('Able to successfully create group', function () {
            return frisby
                .post(
                    `${enterpriseServiceUrl}/organizations/${organizationId}/groups`,
                    organization_group_data.getData({ "id": groupId, "name": groupName })
                )
                .expect('status', 200)
                .then(function (res) {
                    expect(res.json.data[0].name).toBe(groupName)
                })
        })


        test('Should fail creating group for missing group name', function () {
            return frisby
                .post(
                    `${enterpriseServiceUrl}/organizations/${organizationId}/groups`,
                    [
                        {
                            "id": "GRP2"
                        }
                    ]
                )
                .expect('status', 400)
        })


        test('Should fail creating group for wrong url', function () {
            return frisby
                .post(
                    `${enterpriseServiceUrl}/organizations/${organizationId}/groups1`,
                    [
                        {
                            "id": "GRP2"
                        }
                    ]
                )
                .expect('status', 404)
        })

    })
    /*
    describe('group:update', () => {
        test('Able to successfully update group', function () {
            return helpers_common.runAuthenticatedTest(frisby).then(function(token){
                return frisby
                    .setup({
                        request: {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        }
                    })
                    .put(
                            `${enterpriseServiceUrl}/enterprise/admin/api/v3/organizations/${organizationId}/groups/${groupId}`,
                            {
                                "name": "Public Group1",
                                "isPrivate": true
                            }
                    )
                    .expect('status', 200)
                    .then(function(res){
                        console.log(res.json.data)
                        //expect(res.json.data.name).toBe(groupName)
                    })
            })
        })
    })

	
    describe('group:user:list', () => {
        test('get list of all groups in organizations', function () {
            return helpers_common.runAuthenticatedTest(frisby).then(function(token){
                return frisby
                    .setup({
                        request: {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        }
                    })
                    .get(
                        `${enterpriseServiceUrl}/enterprise/admin/api/v3/organizations/${organizationId}/groups`
                    )
                    .expect('status', 200)
                    .inspectBody()
            })
        })
    })
	
    describe('get:groups:list', () => {
        test('Get list of users in group', function () {
            return helpers_common.runAuthenticatedTest(frisby).then(function(token){
                return frisby
                    .setup({
                        request: {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        }
                    })
                    .get(
                        `${enterpriseServiceUrl}/enterprise/admin/api/v3/organizations/${organizationId}/groups/${groupId}/users?limit=2&from=CMqPWBHffeujdlJwJucg`
                    )
                    .expect('status', 200)
                    .inspectBody()
            })
        })
    })
    */
})
