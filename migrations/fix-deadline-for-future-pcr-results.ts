/**
 * This script to go through all future appointments and fix deadline for results 
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
    const testResultSnapshot = await database
      .collection('appointments')
      .where('dateTime','>',firestore.Timestamp.now())
      .offset(offset)
      .limit(limit)
      .get()

    offset += testResultSnapshot.docs.length
    hasMore = !testResultSnapshot.empty
    hasMore = false

    for (const testResult of testResultSnapshot.docs) {
      const promises = []
      promises.push(fixDeadline(testResult))
      const result = await promiseAllSettled(promises)
      results.push(...result)
    }
  }
  return results
}

async function fixDeadline(
  snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>,
) {
  const appointmentId = snapshot.id
  const appointmentData = snapshot.data()
  const pcrResultInDb = await database
    .collection('pcr-test-results')
    .where('appointmentId', '==', appointmentId)
    .get()

  if (!pcrResultInDb || pcrResultInDb.docs.length == 0) {
    return Promise.reject(`appointmentId: ${appointmentId} doesn't have any results`)
  }

  try {
    console.info(`AcuityAppointmentId: ${appointmentId} total results: ${pcrResultInDb.docs.length}`)

    pcrResultInDb.docs.forEach(async (pcrResult) => {
      if(appointmentData.dateTime!==pcrResult.data().dateTime){
        console.log(`PCRResultId: ${pcrResult.id} has different dateTime than appointment `)
      }
      if(appointmentData.deadline!==pcrResult.data().deadline){
        console.log(`PCRResultId: ${pcrResult.id} has different deadline than appointment `)
      }
      /*await pcrResult.ref.set(
        {
          displayInResult: false,
          previousResult: null,
          timestamps: {
            migrations: {
              addFlagForDisplayInResult: firestore.FieldValue.serverTimestamp(),
            },
          },
        },
        {
          merge: true,
        },
      )*/
      //console.log(`Successfully updated PCRResult: ${pcrResult.id} displayInResult: false`)
    })

    return Promise.resolve()
  } catch (error) {
    console.warn(error)
    throw error
  }
}

async function main() {
  try {
    console.log(`Migration Starting Time: ${Date.now()}`)
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
