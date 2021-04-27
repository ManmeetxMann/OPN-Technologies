/**
 * Script to generate random codes in Firestore RapidHomeKitCodes collection
 */
import admin, {initializeApp, credential} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'
import {customAlphabet} from 'nanoid/async'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 6)

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})

async function main() {
  const db = admin.firestore()
  const collection = db.collection('rapid-home-kit-codes')
  const randomCode = await nanoid()

  await collection.add({
    code: randomCode,
    printed: false,
  })

  return randomCode
}

main()
  .then(async (result) => {
    const data = await result
    console.log('Code Generated:', data)
  })
  .catch((e) => console.warn('Code Generation Failed: ', e))
