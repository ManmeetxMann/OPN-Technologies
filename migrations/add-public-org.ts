/**
 * This script add organization
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})
console.log(serviceAccount.project_id)

const database = firestore()

async function main() {
  database
    .collection('organizations')
    .add({
      key: 88190,
      name: 'OPN Public ORG',
      type: 'default',
      allowDependants: false,
      enablePushNotifications: false,
      dayShift: 0,
      enableTemperatureCheck: false,
      legacyMode: false,
      enableTesting: false,
    })
    .then((response) => {
      database.collection('organizations').doc(response.id).collection('organization_groups').add({
        name: 'Default Group',
        isPrivate: false,
        priority: 0,
      })
    })

  return
}

main().then(() => console.log('Script Complete \n'))
