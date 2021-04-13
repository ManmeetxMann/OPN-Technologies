/**
 Script to get users with multi ORGs
 */
import fetch from 'node-fetch'
import admin, {initializeApp, credential} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
const apiKey = Config.get('FIREBASE_API_KEY')
initializeApp({
  credential: credential.cert(serviceAccount),
})


const firstName = "developers"
const lastName = "fhblab1"
const email = `${firstName}+${lastName}@fhhealth.ca`
const password = '1plastic2!'

async function main() {
  const displayName = `${firstName} ${lastName}`
  let authUID;
  try {
      const authUser = await admin.auth().getUserByEmail(email)
      authUID = authUser.uid
  } catch {
      const authUser = await admin.auth().createUser({email: email, displayName: displayName, password:password})
      authUID = authUser.uid
      console.log("Created New User")
  }
  const cusToken = await admin.auth().createCustomToken(authUID)
  const body = JSON.stringify({
    'token': cusToken,'returnSecureToken': true
  })
  
  const baseUrl = 'https://identitytoolkit.googleapis.com'
  const response = await fetch(`${baseUrl}/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'post',
    headers: {'Content-Type': 'application/json', accept: 'application/json',},
    body,
  })
  return response  
}

main().then(async (response) => {
  const data = await response.json()
  console.log(data)
})
