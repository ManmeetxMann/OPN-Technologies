/**
 * This script to go through all future appointments and fix deadline for results
 */
import {isEmpty} from 'lodash'
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'
import moment from 'moment-timezone'

const timeZone = Config.get('DEFAULT_TIME_ZONE')

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

const getFirestoreTimeStampDate = (datetime: firestore.Timestamp): firestore.Timestamp =>
  firestore.Timestamp.fromDate(
    moment(datetime.toDate()).tz(timeZone).hour(0).minute(0).second(0).utc(true).toDate(),
  )

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
      .collection('pcr-test-results')
      .offset(offset)
      .limit(limit)
      .get()

    offset += testResultSnapshot.docs.length
    hasMore = !testResultSnapshot.empty
    //hasMore = false

    for (const testResult of testResultSnapshot.docs) {
      const promises = []
      promises.push(addTestType(testResult))
      const result = await promiseAllSettled(promises)
      results.push(...result)
    }
  }
  return results
}

async function addTestType(snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>) {
  const updatePCRResult = async (pcrResult) => {
    const updateData = {}
    if (!pcrResult.data().testType) {
      updateData['testType'] = 'PCR'
    }
    if (!isEmpty(updateData)) {
      await pcrResult.ref.set(
        {
          ...updateData,
          timestamps: {
            migrations: {
              addTestType: firestore.FieldValue.serverTimestamp(),
            },
          },
        },
        {
          merge: true,
        },
      )
      console.log(`Successfully updated TESTResult: ${pcrResult.id}`)
      return 'Updated'
    }
    return
  }

  try {
    return updatePCRResult(snapshot)
  } catch (error) {
    console.warn(error)
    throw error
  }
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
    console.log(`Total Results Processed: ${totalCount} `)
  }
}

// Maximum batch size to query for
let successCount = 0
let failureCount = 0
let totalCount = 0
const limit = 50

main().then(() => console.log('Script Complete \n'))
