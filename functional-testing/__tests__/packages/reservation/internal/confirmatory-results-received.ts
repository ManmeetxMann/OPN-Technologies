import frisby from 'frisby'
import helpersCommon from '../../../../helpers/helpers_common'
import testProfile from '../../../../test_data/test_profile'

// Do setup first
frisby.globalSetup({
	request: {
		headers:  helpersCommon.headers()
	}
});
const reservationServiceUrl = process.env.RESERVATION_SERVICE_URL
/**
 * @group reservation-service
 * @group /reservation/internal/api/v1/confirmatory-results-received
 * @group confirmatory-results-received
 */
describe('Confirmatory Results', () => {
  test('Succcessfully Received Confirmatory Results',  () => {
      const url = `${reservationServiceUrl}/reservation/internal/api/v1/confirmatory-results-received`
      return frisby
              .post(
                    url,
                    {
                        message:{
                            data: "eyJiYXJDb2RlIjoiVEVTVDEwMDAwOTgxIiwiYWN0aW9uIjoiTWFya0FzTmVnYXRpdmUifQ==",
                        }
                    }
                )
                .inspectBody()
                .expect('status', 200)
  })
})