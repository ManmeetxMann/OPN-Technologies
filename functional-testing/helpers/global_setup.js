module.exports = async () => {
	const frisby = require('frisby');
	const admin = require('firebase-admin')
	const environemnt = require('dotenv/config')
	const testProfile = require('../test_data/test_profile');
	const FIREBASE_ADMINSDK_SA={"type": "service_account","project_id": "opn-platform-infra-dev","private_key_id": "dca9dcbc940799a974b3c934e4a4208e3b53d0fc","private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCV7yvbQCJ233b6\n1OT4STxKQZYdAO+lTXwXD8cRywP0yrw3paI3SVackPgyZeXdt5/fbbuyaBcZbs5B\nBsE0ZNy4Ih7MKzAu/o/7QROYu53FwsM9pamzT417KlSuDxS2O6WzVffdg5LEjXDr\ntB+7pB7hGQnOCHSZ6cCXU/gadEQS4dr4euekjsqj1Ga3miLoNXu3gGu62YRSjf9/\n/MGnG4ApDN+xVJU5cjNgMLGqvMA+n8lKyi7Fvyrz4rGaoYRnZZM2FNoXJ7kkTyvB\ni0ilFVQb9u6nXHAnGtpwBJT3dTJ710Q5yPZ/s8UJv55kno+WocKYCd9wkuwTiz63\nGgtNh/IxAgMBAAECggEAIHN2GgutCe5+2XZHoodzUZ0VaOyhcbUuFO24x9yZXBuf\nFio2zGGGqfdkiL/uOwk5xImDFO+bhEkrwf48xeLItN/Jq6XzVVCKiDaDD80Xrkxj\npo2bB7DBrfUxA8VG1dReHk0Oizalhv4YASPotFumxVB+g0XoOsHRic9GRS+B5lX/\n2ToKuB4EVLGb+GQGBD8hWo6gIfhWVYSk2N+ZhE7FAQWGFOj0eBnFcf3MK0RRdKG3\njCcY+HP+UXNLlaRUpUfg/eYErDmgcisbuSEhO/45VZ1wPkuPTdQc/cujpaEKkSph\nsE5Ivp4qhH5DDOa0NONlIFDXTvbgLKcIiD0RC7vFeQKBgQDTddB3zQW/Eu8pAVv5\nAulEqki+LtMPJVVwBCBxe8Ng6VOZa73rpe8/J4XFQnNZtjkiwk0arh+3jVzCeTdh\nqd8EE5/O7+DVEdx8BImzbBQLyR3ZGOkzsh+O+ITBMIdbkS79ZWZEiSNEyxudV8TZ\nCzHMBkIsREbdIWfkURWJ9PJepQKBgQC1g84E7GmWs8Yo4Ci7xZEhB6QdeBeGiEOJ\nOI1R0oaGyxbAZygqoGJlEefOGEWPs27ZnGkrYdPLMgLHlGrKDRSHG3j1a126NrbW\nUgMVVVBYJT7AGsaf4nrC2JgxYvMR4mIgkuPqwKXnPbJ1rC50c6OwJuIVaT3OnRxf\n0SXhMV6bnQKBgQCwMZedavCh0BYE1cQbzSgu9bAc/4kPMq1o45dg153pTyFAUbzy\n79VUiwr0XTUeCC69Xqa+V13IJHqo9DWII/HWRL/AvrFY+EP99g4CuUhOtaowLYiK\ncZ3IFB0Rl+0BCAzeSLIY4yfG93Gv/eTgcGpytLhIiC9/q4kUfddzluyonQKBgQCy\njdmXlke361g+1WK8c3h0GWQjaQMbX+evkGXT21hiOF1FHzSv2d1wttBkOBQVa9jb\nT7VU64LAG44IbcMuxvcugKPYJ6mniDMLWNmXnrjOPLUhnDVPCibgjNgJnOCm8x68\nFEMHpkKM2nA2uQ1pmGeo3FcB4Ojf2kUTLFYq07nRMQKBgALa9rJzlqw+Y80Mbj39\nytpvpJZiTpv+/k7ZujoAEry2m2yt1zNmVtMXuW8K2ZJuk7XXGkKsxhRQU3dT8Dsz\nI6/nc6w2CHM49sM7EfR6/AArGqU3cZbG+TeqUyLIOWWSEAeTbuUk7EgjG2+wmPil\nSLuhX41/4Id/ZBXUIzBq9gG4\n-----END PRIVATE KEY-----\n","client_email": "firebase-admin-sdk@opn-platform-infra-dev.iam.gserviceaccount.com","client_id": "113466603665019428568","auth_uri": "https://accounts.google.com/o/oauth2/auth","token_uri": "https://oauth2.googleapis.com/token","auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-admin-sdk%40opn-platform-infra-dev.iam.gserviceaccount.com"}

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