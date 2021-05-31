import frisby from 'frisby';
import testProfile from '../../../../test_data/test_profile';
//import helpersCommon from '../../../../helpers/helpers_common'

const enterpriseServiceUrl = process.env.ENTERPRISE_SERVICE_URL
const organizationId = testProfile.get().organizationId

/**
 * @group enterprise-service
 * @group /enterprise/enterprise/api/v3/users/auth
 * @group legacy-user-auth
 * @group public-call
 */
describe('OPN User Auth', () => {
	const url = `${enterpriseServiceUrl}/enterprise/api/v3/users/auth`

	test('should return success on login', () => {
		return frisby
			.post(
				url,
				{
					'email': testProfile.get().email,
					'organizationId': '',
					'userId': ''
				}
			)
			.expect('status', 200)
	})

   test('should send login link successfully for missing ORG used by Admin?', () => {
	   return frisby
		   .post(
			   url,
			   {
				   'email':testProfile.get().email
			   }
		   )
		   .expect('status', 200); 
   })
 
   test('should fail for bad ORG', () => {
	   return frisby
		   .post(
			   url,
			   {
				   'email':testProfile.get().email,
				   'organizationId':'BAD_ORG' 
			   }
		   )
		   .expect('status', 404); 
   })
 
   test('should return validation error if email is missing', () => {
	   return frisby
		   .post(
			   url,
			   {
				   'organizationId':organizationId 
			   }
		   )
		   .expect('status', 400); 
   })
})