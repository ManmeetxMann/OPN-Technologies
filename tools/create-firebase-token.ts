/**
 Script to get firebase token
 */
import fetch from 'node-fetch'
import admin, {initializeApp, credential} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
const apiKey = Config.get('FIREBASE_API_KEY')
initializeApp({
  credential: credential.cert(serviceAccount),
})

const firstName = 'developers'
const lastName = 'fhblab1'
const email = `developers@stayopn.com`
const password = '1plastic2!'

async function main() {
  const displayName = `${firstName} ${lastName}`
  let authUID
  try {
    const authUser = await admin.auth().getUserByEmail(email)
    authUID = authUser.uid
  } catch {
    const authUser = await admin
      .auth()
      .createUser({email: email, displayName: displayName, password: password})
    authUID = authUser.uid
    console.log('Created Firebase New User')

    const db = admin.firestore()
    await db.collection('users').add({
      authUserId: authUID,
      base64Photo: '',
      firstName,
      lastName,
      email,
      organizationIds: ['TEST1'],
      admin: {
        isOpnSuperAdmin: true,
      },
    })

    console.log(
      `Created dummy firestore user with authUserId:${authUID}, replace it with a proper one or use existed email to generate a token`,
    )
  }
  const cusToken = await admin.auth().createCustomToken(authUID)
  const body = JSON.stringify({
    token: cusToken,
    returnSecureToken: true,
  })

  const baseUrl = 'https://identitytoolkit.googleapis.com'
  const response = await fetch(`${baseUrl}/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'post',
    headers: {'Content-Type': 'application/json', accept: 'application/json'},
    body,
  })
  return response
}

main().then(async (response) => {
  const data = await response.json()
  console.log(data)
})