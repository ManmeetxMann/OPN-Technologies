/**
Script to cound new appointments and unique emails that booked appointments 
*/
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})
console.log(`Count Users: ${serviceAccount.project_id}`)

const database = firestore()
const emails = []
async function main() {
  try {
    console.log('Starting Count')
    let after = null
    const baseQuery = database.collection('appointments')
    //.where('organizationIds', 'array-contains', 'PPTEST')
    const queryWithLimit = baseQuery.orderBy(firestore.FieldPath.documentId()).limit(limit)
    let pageIndex = 0
    while (true) {
      const query = after ? queryWithLimit.startAfter(after.id) : queryWithLimit
      const appointments = (await query.get()).docs
      if (appointments.length === 0) {
        break
      }
      after = appointments[appointments.length - 1]
      totalAppointments += appointments.length
      pageIndex += 1
      console.log(`On Page: ${pageIndex}`)
      for (const appointment of appointments) {
        const data = appointment.data()
        if (!emails.includes(data.email)) {
          totalUniqueEmails++
          emails.push(data.email)
        }
      }
    }
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    console.log(`Total Unique Emails: ${totalUniqueEmails} `)
    console.log(`Total Appointments: ${totalAppointments} `)
  }
}

const limit = 500
let totalAppointments = 0
let totalUniqueEmails = 0
main().then(() => console.log('Script Complete \n'))
