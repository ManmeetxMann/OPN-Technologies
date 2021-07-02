/**
 * Add Appointment Status to Appointments
 */
import mysql from 'mysql'
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})
console.log(`Check Duplicates: ${serviceAccount.project_id}`)

const database = firestore()

//LOCAL DB. HardCoding for now
const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'finance',
  port: 8889,
})

export enum ResultStatus {
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

type Result = {
  status: ResultStatus
  value: unknown
}

async function promiseAllSettled(promises: Promise<unknown>[]): Promise<Result[]> {
  return Promise.all(
    promises.map((promise) =>
      promise
        .then((value) => ({
          status: ResultStatus.Fulfilled,
          value,
        }))
        .catch((error: unknown) => ({
          status: ResultStatus.Rejected,
          value: error,
        })),
    ),
  )
}

async function fetchAcuity(): Promise<Result[]> {
  let offset = 0
  let hasMore = true

  const results: Result[] = []

  while (hasMore) {
    const usersSnapshot = await database
      .collection('appointments')
      .where('dateTime', '>=', firestore.Timestamp.fromDate(new Date('2021-04-30T00:00:00')))
      .offset(offset)
      .limit(500)
      .get()
    offset += usersSnapshot.docs.length
    hasMore = !usersSnapshot.empty

    console.log(`Processed ${offset}`)

    for (const user of usersSnapshot.docs) {
      const promises = []
      promises.push(addAppointmentStatus(user))
      const result = await promiseAllSettled(promises)
      results.push(...result)
    }
  }
  return results
}

async function addAppointmentStatus(appointment) {
  const appointmentData = appointment.data()
  if (!appointmentData.acuityAppointmentId) {
    return Promise.reject(`acuityAppointmentId Missing for ${appointment.id}`)
  }

  try {
    const sql = `UPDATE appointments SET appointmentStatus='${appointmentData.appointmentStatus}',
                firestoreAppointmentId= '${appointment.id}'
                WHERE acuityId=${appointmentData.acuityAppointmentId}`

    return new Promise((resolve, reject) => {
      conn
        .query(sql)
        .on('error', (err) => {
          console.log(err.sqlMessage)
          reject(err.sqlMessage)
        })
        .on('end', () => {
          //console.log('Updated')
          resolve('Updated')
        })
    })
  } catch (error) {
    return Promise.reject('Failed')
  }
}

async function main() {
  try {
    const results = await fetchAcuity()
    results.forEach((result) => {
      totalCount += 1
      if (result.status === ResultStatus.Fulfilled) {
        if (result.value == 'Created') {
          successCount += 1
        }
      } else {
        console.warn(result.value)
        failureCount += 1
      }
    })
    console.log(`Succesfully updated ${successCount} `)
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    console.warn(`Failed updating ${failureCount} `)
    console.log(`Total Appointments Processed: ${totalCount} `)
    conn.end()
  }
}

// Maximum batch size to query for
let successCount = 0
let failureCount = 0
let totalCount = 0

main().then(() => console.log('Script Complete \n'))
