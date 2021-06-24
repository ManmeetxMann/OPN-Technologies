import frisby from 'frisby'
import helpersCommon from '../../../../helpers/helpers_common'
const Joi = frisby.Joi;
const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;

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
 * @group /reservation/admin/api/v1/pcr-test-results
 * @group get-pcr-test-results
 */
describe('Get: /reservation/admin/api/v1/pcr-test-results', () => {
  test('Get PCR Results for Organization should succeed', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results?date=2021-06-16`;
      console.log(url);
      return frisby
          .setup({
            request: {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            },
          })
          .get(url)
          .expect('status', 200)
          .inspectBody();
      // .expect('validateSchema')
    });
  });
  /*
    test('Get PCR Results for Organization should fail for missing deadline', function () {

        return helpersCommon.runAuthenticatedTest(frisby).then(function(token){

            const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results?organizationId=${organizationId}`
            console.log(url)
            return frisby
                .setup({
                    request: {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                })
                .get(url)
                .expect('status', 400)
        })
    })

    test('Get TestResults by Deadline Only for Lab Results', function () {
        return helpersCommon.runAuthenticatedTest(frisby).then(function(token){

            const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results?deadline=2021-01-18`
            console.log(url)
            return frisby
                .setup({
                    request: {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                })
                .get(url)
                .expect('status', 200)
                .inspectBody()
                .expect('validateSchema')
        })
    })

    test('Get TestResults By BarCode', function () {
        return helpersCommon.runAuthenticatedTest(frisby).then(function(token){

            const url = `${reservationServiceUrl}/reservation/admin/api/v1/pcr-test-results?barCode=A1317`
            console.log(url)
            return frisby
                .setup({
                    request: {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                })
                .get(url)
                .expect('status', 200)
                //.expect('validateSchema')
                .inspectBody()
        })
    })
    */
});
