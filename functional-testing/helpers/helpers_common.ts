import admin from 'firebase-admin';

const helperCommon = {
    headers: function () {
        let headers = {
            'Authorization': 'Bearer ',
            'cache-control': 'no-cache',
            'Content-Type': 'application/json'
        }
        return headers;
    },
    runAuthenticatedTest: async function (frisby, email?: string) {
        return process.env.FIREBASE_AUTH_TOKEN
    },
    getAuthToken: async function (frisby, email:string, displayName:string) {
        const firebaseSDKSA = process.env.FIREBASE_ADMINSDK_SA
        const serviceAccount = JSON.parse(firebaseSDKSA)
        const app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        })

        let authUID:string;
        try {
            const authUser = await admin.auth().getUserByEmail(email)
            authUID = authUser.uid
        } catch {
            const authUser = await admin.auth().createUser({ email: email, displayName: displayName, password: '1plastic2!' })
            authUID = authUser.uid
            console.log("Created New Firebase Auth User")
        }

        const cusToken = await admin.auth().createCustomToken(authUID)
        const baseUrl = 'https://identitytoolkit.googleapis.com'
        const response = await frisby
            .post(
                `${baseUrl}/v1/accounts:signInWithCustomToken?key=${process.env.FIREBASE_API_KEY}`,
                {
                    token: cusToken,
                    returnSecureToken: true
                }
            )
            app.delete()
        return response.json.idToken
    },
    getAuthTokenByPhone: async function (frisby, phone:string, displayName:string) {
        let authUID:string;
        try {
            const authUser = await admin.auth().getUserByPhoneNumber(phone)
            authUID = authUser.uid
        } catch {
            const authUser = await admin.auth().createUser({ phoneNumber: phone, displayName: displayName, password: '1plastic2!' })
            authUID = authUser.uid
            console.log("Created New User")
        }
        const cusToken = await admin.auth().createCustomToken(authUID)
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
    },
    getDB: function () {
        return admin.firestore()
    }
}

export default helperCommon