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
    .doc('PUBLIC_ORG')
    .set({
      key: 88190,
      name: 'OPN Public ORG',
      type: 'default',
      enablePaymentForBooking: true,
      allowDependants: false,
      enablePushNotifications: false,
      dayShift: 0,
      enableTemperatureCheck: false,
      legacyMode: false,
      enableTesting: false,
    })
    .then(() => {
      database
        .collection('organizations')
        .doc('PUBLIC_ORG')
        .collection('organization_groups')
        .doc('PUBLIC_GROUP')
        .set({
          name: 'Public',
          isPrivate: false,
          priority: 0,
        })
    })
    .then((response) => {
      console.log(response)
      database
        .collection('organizations')
        .doc('PUBLIC_ORG')
        .collection('locations')
        .doc('PUBLIC_LOCATION')
        .set({
          title: 'Public',
          address: 'Public',
          city: 'Public',
          state: 'Public',
          zip: 'Public',
          country: 'Public',
          allowAccess: true,
          allowsSelfCheckInOut: true,
          attestationRequired: true,
          parentLocationId: null,
        })
    })

  return
}

main().then(() => console.log('Script Complete \n'))
