const frisby = require('frisby');
const tv4 = require('tv4');
const moment = require('moment');
const helpersCommon = require('helpersCommon');
// const admin_tags_data = require('enterprise/admin_tags_data');
const testProfile = require('test_profile');
const schemaDefinations = require('reservation/test_result').schemaDefinations;
const test_results_data = require('reservation/test_results');
const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL;
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
    const jsonData = response.json;
    const schema = {'$ref': 'TestResultList'};

    tv4.addSchema('schema', schema);
    tv4.addSchema('TestResultList', schemaDefinations.$TestResultList);
    tv4.addSchema('TestResultResponse', schemaDefinations.$TestResultResponse);
    tv4.addSchema('OPNStatus', schemaDefinations.$OPNStatus);

    const validation = tv4.validateMultiple(jsonData, schema, true, true);
    console.log(validation);

    if (!validation.valid) {
      console.log('Schema Validation failed');
      let i;
      for (i = 0; i < validation.errors.length; i++) {
        console.log('param:' + validation.errors[i].dataPath + ', error:' + validation.errors[i].message);
      }
    }
    expect(validation['valid']).toBe(true);
  });
});
/**
 * @group reservation-service
 * @group /reservation/internal/api/v1/process-pcr-test-result
 * @group post-process-pcr-test-result
 */
describe('/reservation/internal/api/v1/process-pcr-test-result:post', () => {
  test('process-pcr-test-result', function() {
    return helpersCommon.runAuthenticatedTest(frisby).then(function(token) {
      const url = `${reservationServiceUrl}/reservation/internal/api/v1/process-pcr-test-result`;
      return frisby
          .setup({
            request: {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            },
          })
          .post(
              url,
              {reportTrackerId: 'rXVZ2iTC4aNmlDJV8FHj', resultId: 'UyUhg1evjeDZmrdBnCaK'},
          )
          .expect('status', 200)
          .inspectBody();
    });
  });
});
