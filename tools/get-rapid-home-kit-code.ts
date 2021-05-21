/**
 * Script to generate random codes in Firestore RapidHomeKitCodes collection
 */
import admin, {initializeApp, credential} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'
import {customAlphabet} from 'nanoid/async'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6)

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})

const db = admin.firestore()
const collection = db.collection('rapid-home-kit-codes')

const countOfCodes = 500

async function main() {
  return db.runTransaction(async (transaction) => {
    const codesToCreate = new Set<string>()

    /**
     * Read operations
     * Find collisions for every generated code
     */
    for (let i = 0; i < countOfCodes; i++) {
      const randomCode = await nanoid()
      const query = collection.where('code', '==', randomCode).limit(1)
      const {docs} = await transaction.get(query)

      if (docs.length) {
        throw new Error(`Collision detected for code: ${randomCode}`)
      }

      codesToCreate.add(randomCode)
    }

    /**
     * Write operations
     * if collision doesn't exist create document
     */
    const results = Array.from(codesToCreate).map((code: string) => {
      const codeDocument = collection.doc()
      transaction.set(codeDocument, {code, printed: false})
      return code
    })

    return results
  })
}

main()
  .then((result) => {
    console.log(`Created ${result.length} code with ${countOfCodes - result.length} collision`)
    console.log('Codes Generated:', result)
  })
  .catch((e) => console.warn('Code Generation Failed: ', e))
