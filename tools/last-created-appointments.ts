/**
 * Reads all appointments created withing last N minutes
 * Used for use-case when new equity fields are added and appointments need to re-sync
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})
console.log(`Check last crated appointments on GCP project: ${serviceAccount.project_id}`)

const database = firestore()

/**
 * From minutes to query
 */
const FROM_MIN = 1

async function main() {
  const nowData = new Date()
  const beginningDateObject = new Date(nowData.getTime() - 60 * FROM_MIN * 1000)

  const result = await database
    .collection('appointments')
    .where('timestamps.updatedAt', '>', firestore.Timestamp.fromDate(beginningDateObject))
    .get()

  console.log(`Appointment created from ${beginningDateObject.toISOString()}`)

  for (const appointment of result.docs) {
    const data = appointment.data()
    console.log(appointment.id, data.acuityAppointmentId, data.timestamps.updatedAt.toDate())
  }
}

main().then(() => console.log('Script Complete \n'))
