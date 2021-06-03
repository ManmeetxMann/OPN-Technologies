import frisby from 'frisby';
import helpersCommon from '../../../helpers/helpers_common'

const organization_data = require('enterprise/organization_data');

// Do setup first
frisby.globalSetup({
    request: {
        headers: helpersCommon.headers()
    }
});

const enterpriseServiceUrl = process.env.ENTERPRISE_SERVICE_URL

/**
 * @group enterprise-service
 * @group /enterprise/admin/api/v1/organizations      
 * @group create-organization     
 * @group public-call
 */
describe('admin:organization:create', () => {
    const organizationId= 'ORG_WITH_ATTEST_ONLY'
    test('Able to successfully create Organization with attestation only', async () => {
        const token = await helpersCommon.runAuthenticatedTest(frisby);

        const data = await frisby
            .setup({
                request: {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            })
            .post(
                `${enterpriseServiceUrl}/enterprise/admin/api/v1/organizations`,
                organization_data.getData({ "id": organizationId,"enableTemperatureCheck": false })
            )
            expect(data.status).toEqual(200)
            expect(data.json.data.id).toBe(organizationId)
    })

    /*
    test('Able to successfully get organization by Id', function () {
        return frisby
                .get(
                    `${enterpriseServiceUrl}/organizations/one?id=${organizationId}`
                )
                .expect('status', 200)
                .then(function(res){
                    expect(res.json.data.key).toBeGreaterThan(1)
                })
    })
    test('Failed to get organization using incorrect Id', function () {
        return frisby
                .get(
                    `${enterpriseServiceUrl}/organizations/one?id=BADID`
                )
                .expect('status', 200)
                .inspectBody()
                .then(function(res){
                    expect(res.json.data).toBeNull()
                })
    })
    test('Failed to get incorrect organization using incorrect key', function () {
        return frisby
                .get(
                    `${enterpriseServiceUrl}/organizations/one?key=900000000000`
                )
                .expect('status', 404)
                .then(function(res){
                    expect(res.json.data).toBeNull()
                })
    })
    test('Able to successfully get Organization by id', function () {
        return createNewOrg
                .then(function(response){
                    return frisby
                        .get(
                            `${enterpriseServiceUrl}/organizations/one?key=${response.json.data.key}`
                        )
                        .expect('status', 200)
                        .then(function(res){
                            expect(res.json.data.id).toBe(organizationId)
                        })
                })
    })
    test('Able to successfully update Scheduling for ORG', function () {
        const hourToSendReport = 1
        const dayShift = 1
        return frisby
                .post(
                    `${enterpriseServiceUrl}/organizations/${organizationId}/scheduling`,
                    {
                        "hourToSendReport": hourToSendReport,
                        "dayShift": dayShift
                    }
                )
                .expect('status', 200)
                .inspectBody()
                .then(function(res){
                    expect(res.json.data.hourToSendReport).toBe(hourToSendReport)
                    expect(res.json.data.dayShift).toBe(dayShift)
                })
    })
    */
})
