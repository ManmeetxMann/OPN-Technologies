import frisby from 'frisby'
import helpersCommon from '../../../../helpers/helpers_common'
import testProfile from '../../../../test_data/test_profile'

const Joi = frisby.Joi
const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL
// const timeZone = process.env.DEFAULT_TIME_ZONE
const organizationId = testProfile.get().organizationId;

// Do setup first
frisby.globalSetup({
  request: {
    headers: helpersCommon.headers(),
  },
});

beforeAll(function() {
  // Add our custom expect handler
  frisby.addExpectHandler('validateSchema', function(response) {
    const schema = Joi.object({
      data: Joi.array().items(
          Joi.object({
            id: Joi.string().required(),
            barCode: Joi.string().required(),
            result: Joi.string().required(),
            deadline: Joi.date().iso().required(),
            dateTime: Joi.date().iso().required(),
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            testType: Joi.string().required(),
            testRunId: Joi.string(),
            previousResult: Joi.string().allow(null),
          }),
      ),
      status: Joi.object({
        code: Joi.string().required(),
        message: Joi.string().allow(null),
      }),
      page: Joi.number().required(),
    });
    const {error} = schema.validate(response.json);
    expect(error).toBe(null);
  });
});

/**
 * @group reservation-service
 * @group /reservation/api/v1/test-results
 * @group get-test-result-list-for-user
 */
describe('Get: /reservation/api/v1/test-results', () => {
  test('Get Test Results for User should Success', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/api/v1/test-results`;
      console.log(url);
      return frisby
          .setup({
            request: {
              headers: {
                'Authorization': `Bearer ${token}`,
                'organizationid': organizationId,
              },
            },
          })
          .get(url)
          .expect('status', 200)
          .inspectBody();
      // .expect('validateSchema')
    });
  });
});
