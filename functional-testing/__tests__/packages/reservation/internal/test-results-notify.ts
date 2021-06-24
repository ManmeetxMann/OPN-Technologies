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
 * @group /reservation/api/v1/pubsub/test-result
 * @group pubsub-test-result
 */
describe('test results notify-by-email', () => {
  test('Succcessfully notify by email',  () => {
      const url = `${reservationServiceUrl}/reservation/api/v1/pubsub/pubsub/test-result/notify-by-email`
      return frisby
              .post(
                    url,
                    {
                        message:{
                            data: "eyJpZCI6IjAxMFN3RU5Kek9BeGpmemt3UU93IiwicmVzdWx0IjoiTmVnYXRpdmUiLCJkYXRlIjoiMjAyMS0wNi0xMFQyMDo1NTowMC4wMDBaIiwidXNlcklkIjoiU3BhRHNOUXZUdElEM2xnYnVqYkYiLCJvcmdhbml6YXRpb25JZCI6IiIsImFjdGlvblR5cGUiOiJTZW5kVGhpc1Jlc3VsdCIsInBob25lIjoiMzMzMzMzMzMzMyIsImZpcnN0TmFtZSI6IkhTRyJ9",
                        }
                    }
                )
                .inspectBody()
                .expect('status', 200)
  })
})