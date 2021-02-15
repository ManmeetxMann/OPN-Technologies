/**
 * This script to go through all future canceled appointments and delete results
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})
console.log(serviceAccount.project_id)

const database = firestore()

export enum ResultStatus {
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

type Result = {
  status: ResultStatus
  value: unknown
}

export async function promiseAllSettled(promises: Promise<unknown>[]): Promise<Result[]> {
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

async function updateTestResults(): Promise<Result[]> {
  let offset = 0
  let hasMore = true

  const results: Result[] = []

  while (hasMore) {
    const appointmentsSnapshot = await database
      .collection('appointments')
      .where('dateTime', '>=', firestore.Timestamp.fromDate(new Date('2021-02-01T00:00:00')))
      .where('canceled', '==', true)
      .offset(offset)
      .limit(limit)
      .get()

    offset += appointmentsSnapshot.docs.length
    hasMore = !appointmentsSnapshot.empty
    //hasMore = false

    const promises = []
    for (const appointment of appointmentsSnapshot.docs) {
      promises.push(deleteResult(appointment))
    }
    const result = await promiseAllSettled(promises)
    results.push(...result)
  }
  return results
}

async function deleteResult(snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>) {
  const appointmentId = snapshot.id
  //const appointmentData = snapshot.data()
  const pcrResultInDb = await database
    .collection('pcr-test-results')
    .where('appointmentId', '==', appointmentId)
    .get()

  if (!pcrResultInDb || pcrResultInDb.docs.length == 0) {
    return Promise.reject(`appointmentId: ${appointmentId} doesn't have any results`)
  }

  if (!pcrResultInDb || pcrResultInDb.docs.length > 1) {
    return Promise.reject(`appointmentId: ${appointmentId} have more than 1 results`)
  }
  console.log(
    `appointmentId: ${appointmentId} PCRResultID: ${pcrResultInDb.docs[0].id} will be deleted`,
  )
  return Promise.resolve('Deleted')
}

async function main() {
  try {
    console.log(`Migration Starting Time: ${new Date()}`)
    const results = await updateTestResults()
    results.forEach((result) => {
      totalCount += 1
      if (result.status === ResultStatus.Fulfilled) {
        if (result.value) {
          successCount += 1
        }
      } else {
        console.error(result.value)
        failureCount += 1
      }
    })
    console.log(`Succesfully updated ${successCount} `)
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    console.warn(`Failed updating ${failureCount} `)
    console.log(`Total Appointments Processed: ${totalCount} `)
  }
}

// Maximum batch size to query for
let successCount = 0
let failureCount = 0
let totalCount = 0
const limit = 50

main().then(() => console.log('Script Complete \n'))

// npm run migration:add-display-in-result-flag-to-pcr-results > add-display-in-result-flag-to-pcr-results-info-dev.log 2> add-display-in-result-flag-to-pcr-results-error-dev.log
