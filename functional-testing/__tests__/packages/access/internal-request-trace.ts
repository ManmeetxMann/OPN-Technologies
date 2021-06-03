import frisby from 'frisby'
import helpersCommon from '../../../helpers/helpers_common'
import testProfile from '../../../test_data/test_profile'

// Do setup first
frisby.globalSetup({
	request: {
		headers:  helpersCommon.headers()
	}
});
const accessServiceUrl = process.env.ACCESS_SERVICE_URL

/**
 * @group access-service
 * @group /requestTrace
 * @group request-trace
 */
describe('post:passport: /requestTrace', () => {
  test('Succcessfully Created new Passport.',  () => {
      const url = `${accessServiceUrl}/requestTrace`
      return frisby
              .post(
                    url,
                    {
                        message:{
                            data: "eyJ1c2VySWQiOiJ2TFpYZUpIVDRmbjB6MWN3OEhzciIsImRlcGVuZGFudElkcyI6WyJBeU9GUmtXQ1A1TEI5d1ZZZDNLNSJdLCJpbmNsdWRlc0d1YXJkaWFuIjpmYWxzZSwicGFzc3BvcnRTdGF0dXMiOiJjYXV0aW9uIiwic3RhcnRUaW1lIjoxNjE0NzQzMDI1ODk2LCJlbmRUaW1lIjoxNjE0OTE1ODI2Mjk1LCJvcmdhbml6YXRpb25JZCI6IjhVdHdFSENMRHROakRPSFlBYXpqIiwibG9jYXRpb25JZCI6InAxVXd6Y1M1emFwSFZwN0FQVGFwIiwiYW5zd2VycyI6eyIxMCI6eyIxIjpmYWxzZX0sIjExIjp7IjEiOmZhbHNlfSwiMTIiOnsiMSI6ZmFsc2V9LCIxMyI6eyIxIjpmYWxzZX0sIjE0Ijp7IjEiOmZhbHNlLCIyIjoiMjAyMS0wMy0wNFQyMjo0Mzo0NS44OTYtMDUwMCJ9LCIwMiI6eyIxIjpmYWxzZX0sIjA5Ijp7IjEiOmZhbHNlfSwiMDgiOnsiMSI6ZmFsc2V9LCIwMyI6eyIxIjpmYWxzZX0sIjA1Ijp7IjEiOmZhbHNlfSwiMDYiOnsiMSI6ZmFsc2V9LCIwNyI6eyIxIjpmYWxzZX0sIjAxIjp7IjEiOnRydWV9LCIwNCI6eyIxIjpmYWxzZX19fQ=="
                        }
                    }
                )
                .inspectBody()
                .expect('status', 200)
  })
})