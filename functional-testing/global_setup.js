module.exports = async (data) => {
	console.log(process.env.USER_ROLE)
	require('dotenv/config')
	const frisby = require('frisby');
	const admin = require('firebase-admin')
	const testProfile = require('./test_data/test_profile');

	const firebaseSDKSA = process.env.FIREBASE_ADMINSDK_SA
	const serviceAccount = JSON.parse(firebaseSDKSA)
	const app = admin.initializeApp({
		credential: admin.credential.cert(serviceAccount),
	})
  const authUser = await admin.auth().getUserByEmail(testProfile.get().email)
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
	process.env.FIREBASE_AUTH_TOKEN=response.json.idToken
	app.delete()
};