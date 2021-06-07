import frisby from 'frisby';
const Joi = frisby.Joi;
import helpersCommon from '../../../../helpers/helpers_common'
import testProfile from '../../../../test_data/test_profile';

// Do setup first
frisby.globalSetup({
    request: {
        headers: helpersCommon.headers(),
        'timeout': 30000,
    },
});
jest.setTimeout(30000);
const serviceUrl = process.env.ENTERPRISE_SERVICE_URL;
const organizationId = testProfile.get().organizationId

beforeAll(function () {
    // Add our custom expect handler
    frisby.addExpectHandler('validateSchema', function (response) {
        const schema = Joi.object({
            data: Joi.object({
                accesses: Joi.array().items(
                    Joi.object({
                        token: Joi.string().allow(null),
                        statusToken: Joi.string().allow(null),
                        locationId: Joi.string().allow(null),
                        createdAt: Joi.string().allow(null),
                        enteredAt: Joi.string().allow(null),
                        exitAt: Joi.string().allow(null),
                        includesGuardian: Joi.string().allow(null),
                        dependants: Joi.string().allow(null),
                        parentUserId: Joi.string().allow(null),
                        //deadline: Joi.date().iso().required(),
                        userId: Joi.string().required(),
                        status: Joi.string().required(),
                        user: Joi.object({
                            id: Joi.string().required(),
                            delegates: Joi.array().allow(null),
                            email: Joi.string().allow(null),
                            authUserId: Joi.string().allow(null),
                            firstName: Joi.string().required(),
                            lastName: Joi.string().required(),
                            base64Photo: Joi.string().allow(null,""),
                            registrationId: Joi.string().allow(null,""),
                            organizationIds: Joi.array(),
                            organizations: Joi.array(),
                            admin: Joi.object().unknown(true),

                            timestamps: Joi.object().unknown(true),
                            registrationAnswersByOrganizationId:Joi.object(),
                            active: Joi.boolean().allow(null),
                            phone: Joi.string().allow(null),
                            photo: Joi.string().allow(null),
                            memberId: Joi.string().allow(null),
                        })
                    }),
                ),
                asOfDateTime: Joi.string().required(),
                passportsCountByStatus: Joi.object({
                    pending: Joi.number().required(),
                    proceed: Joi.number().required(),
                    caution: Joi.number().required(),
                    stop: Joi.number().required(),
                    temperature_check_required: Joi.number().required()
                }),
                hourlyCheckInsCounts: Joi.array()
            }),
            status: Joi.object({
                code: Joi.string().required(),
                message: Joi.string().allow(null),
            }),
            page: Joi.number().required(),
        });
        //const { error } = schema.validate(response.json);
        const { error } = schema.validate(response.json, { stripUnknown: true });
        expect(error).toBe(null);
    });
})
/**
 * @group enterprise-service
 * @group /access/api/v1/admin/stats/v2
 * @group admin-stats
 * @group admin-user
 */
describe('Get Admin Stats', () => {
    test('able to successfully get stats', async () => {
        const token = await helpersCommon.runAuthenticatedTest(frisby)
        const url = `${serviceUrl}/organizations/${organizationId}/stats?groupId=67Ax1Z9Z9HjXurZLaMR0`;
        const response = await frisby
            .setup({
                request: {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'timeout': 30000,
                    },
                },
            })
            .get(url)
            .expect('validateSchema')
            .inspectBody()
        expect(response.status).toEqual(200)


    })
    /*
    test('able to successfully get admin-stats-v2', async () => {
        const url = `${serviceUrl}/organizations/${organizationId}/stats/health`;
        const token = await helpersCommon.runAuthenticatedTest(frisby)
        
        await frisby
        .setup({
            request: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        })
        .get(url)
        .inspectBody()
        .expect('status', 200);
    })
    */
})
