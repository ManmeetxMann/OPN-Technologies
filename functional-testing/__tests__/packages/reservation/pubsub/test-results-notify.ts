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
describe('post:passport: /requestTrace', () => {
  test('Succcessfully Created new Passport.',  () => {
      const url = `${reservationServiceUrl}/reservation/api/v1/pubsub/test-result`
      return frisby
              .post(
                    url,
                    {
                        message:{
                            data: "eyJpZCI6ImF4NFFJbVdzaWlFZmFnRURrak1qIiwicmVzdWx0IjoiTmVnYXRpdmUiLCJkYXRlIjoiMjAyMS0wNi0xMFQyMDo1NTowMC4wMDBaIiwidXNlcklkIjoiU3BhRHNOUXZUdElEM2xnYnVqYkYiLCJvcmdhbml6YXRpb25JZCI6IiIsImFjdGlvblR5cGUiOiJTZW5kVGhpc1Jlc3VsdCIsInBob25lIjoiMzMzMzMzMzMzMyIsImZpcnN0TmFtZSI6IkhTRyJ9",
                            attributes: {
                                notficationType: "RecollectAsInconclusive",
                                organizationId: "AWPcjxR5i725bC91YUUE",
                                firstName: "HSG",
                                actionType: "RecollectAsInconclusive",
                                userId: "SpaDsNQvTtID3lgbujbF",
                                phone: "3333333333"
                            }
                        }
                    }
                )
                .inspectBody()
                .expect('status', 200)
  })
})