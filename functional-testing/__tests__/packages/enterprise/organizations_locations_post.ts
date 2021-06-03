import frisby from 'frisby';
import helpersCommon from '../../../helpers/helpers_common'
import testProfile from '../../../test_data/test_profile';

const organization_location_data = require('enterprise/organization_location_data');
// Do setup first
frisby.globalSetup({
    request: {
        headers: helpersCommon.headers()
    }
});

const enterpriseServiceUrl = process.env.ENTERPRISE_SERVICE_URL
const organizationId = testProfile.get().organizationId
const locationTitle1 = testProfile.get().locationTitle
/**
 * @group enterprise-service
 * @group /enterprise/admin/api/v1/organizations      
 * @group create-location
 * @group public-call
 */
describe('admin:organization:locations:create', () => {
    test('Able to successfully create Locations', function () {
        return frisby
            .post(
                `${enterpriseServiceUrl}/organizations/${organizationId}/locations`,
                organization_location_data.getData({ "title": locationTitle1, "questionnaireId": `${organizationId}_QUESTIONAIRE` })
            )
            .expect('status', 200)
            .then(function (res) {
                expect(res.json.data[0].title).toBe(locationTitle1)
            })
    })

    test('Able to successfully get Locations', function () {
        return frisby
            .get(
                `${enterpriseServiceUrl}/organizations/${organizationId}/locations`
            )
            .expect('status', 200)
    })
/*
    test('Able to successfully update Locations', function () {
        return frisby
            .get(
                `${enterpriseServiceUrl}/organizations/${organizationId}/locations`
            )
            .then(function (locationResponse) {
                const locationUpdated = `${organizationId} LOC1`
                let locationData = locationResponse.json.data
                locationData[0].title = locationUpdated
                return frisby
                    .put(
                        `${enterpriseServiceUrl}/organizations/${organizationId}/locations`,
                        locationData
                    )
                    .expect('status', 200)
                    .then(function (res) {
                        expect(res.json.data[0].title).toBe(locationUpdated)
                    })
            })
    })*/
})