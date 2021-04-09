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

const details = `The result of your test was NEGATIVE. Your results do not detect SARS-CoV-2, the virus that causes coronavirus disease (also called COVID-19), a respiratory illness. A negative test means that the virus was not present in the sample we collected. Your results suggest you were negative at the time of testing.

  Although the possibility is low, a false negative result should be considered if you have had recent exposure to the virus along with symptoms consistent with COVID-19.
  
  If you are the patron receiving the test and require further information, please visit the City of Toronto Public Health: https://www.toronto.ca/home/covid-19
  
  If you have further questions or concerns, you can contact FH Health at info@fhhealth.ca or (416) 484-0042.`

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
        console.log('More than one entry was found for a "Negative" resultType')
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
