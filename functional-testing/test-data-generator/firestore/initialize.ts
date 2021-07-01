import admin from 'firebase-admin'

require('dotenv/config')
const firebaseSDKSA = process.env.FIREBASE_ADMINSDK_SA

const serviceAccount = JSON.parse(firebaseSDKSA)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})
export default admin.firestore()