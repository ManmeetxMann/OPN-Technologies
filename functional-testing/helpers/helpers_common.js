const admin = require('firebase-admin')
const testProfile = require('test_profile');

const firebaseSDKSA = process.env.FIREBASE_ADMINSDK_SA
const serviceAccount = JSON.parse(firebaseSDKSA)
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
})

module.exports = {
	headers: function(){		
		let headers = { 
            'Authorization': 'Bearer ',
			'cache-control': 'no-cache',
			'Content-Type': 'application/json'
		}	
		return headers;
	},
	runAuthenticatedTest: async function(frisby, email){
		const authUser = await admin.auth().getUserByEmail((!email)?testProfile.get().email:email)
		const cusToken = await admin.auth().createCustomToken(authUser.uid)
		const baseUrl = 'https://identitytoolkit.googleapis.com'
		const response = await frisby
			.post(
				`${baseUrl}/v1/accounts:signInWithCustomToken?key=${process.env.FIREBASE_API_KEY}`,
				{
					token: cusToken, 
					returnSecureToken: true
				}
			)
		return response.json.idToken  
	}
}