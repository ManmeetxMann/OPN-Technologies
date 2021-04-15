/**
 * This script add content
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})

console.log(serviceAccount.project_id)

const details = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

  Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

  Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`

const database = firestore()

const resultTypes = [
  'PresumptivePositive',
  'PreliminaryPositive',
  'Positive',
  'Negative',
  'Inconclusive',
  'Indeterminate',
]

async function main() {
  resultTypes.map(async (resultType) => {
    const content = await database.collection('content').where('resultType', '==', resultType).get()

    if (content.docs[0]) {
      if (content.docs.length > 1) {
        console.log(`More than one entry was found for a ${resultType} resultType`)
      }
      return content.docs[0].ref.update({details})
    }

    return database.collection('content').add({
      contentType: 'result',
      lang: 'en',
      resultType,
      details,
    })
  })
}

main().then(() => console.log('Script Complete \n'))
