/**
 * This script just overwrite Client Emails in user collections so that no notfication is sent by mistake
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})

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
    const testResultSnapshot = await database.collection('test-results').offset(offset).limit(limit).get()

    offset += testResultSnapshot.docs.length
    hasMore = !testResultSnapshot.empty

    for (const testResult of testResultSnapshot.docs) {
      const promises = []
      promises.push(createPcrTestResult(testResult))
      const result = await promiseAllSettled(promises)
      results.push(...result)
    }
  }
  return results
}

async function createPcrTestResult(
  snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>,
) {
  const testResult = snapshot.data()

  try {
    console.log("testResult", testResult)
    return database.collection('pcr-test-results').add({
      appointmentId: testResult.appointmentId,
      barCode: testResult.barCode,
      dateOfAppointment: testResult.dateOfAppointment,
      displayForNonAdmins: true, // ???
      firstName: testResult.firstName,
      lastName: testResult.lastName,
      organizationId: testResult.organizationId,
      result: testResult.result,
      resultSpecs: {
        action: 'RequestReSample', // ???
        autoResult: testResult.result,
        barCode: testResult.barCode,
        calRed61Ct: testResult.calRed61Ct,
        calRed61RdRpGene: testResult.calRed61RdRpGene,
        famCt: testResult.famCt,
        famEGene: testResult.famEGene,
        hexCt: testResult.hexCt,
        hexIC: testResult.hexIC,
        notify: true, // ???
        quasar670Ct: testResult.quasar670Ct,
        quasar670NGene: testResult.quasar670NGene,
        resultDate: testResult.resultDate
      },
      timestamps: {
        createdAt: testResult.timestamps.createdAt,
        updatedAt: testResult.timestamps.updatedAt
      },
      waitingResult: false // ???
    })
  } catch (error) {
    throw error
  }
}

async function main() {
  try {
    console.log('Migration Starting')
    const results = await updateTestResults()
    results.forEach((result) => {
      if (result.status === ResultStatus.Fulfilled) {
        // @ts-ignore - We will always have a value if the status is fulfilled
        if (result.value) {
          successCount += 1
        }
      } else {
        failureCount += 1
      }
    })

    console.log(`Succesfully updated ${successCount} `)
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    if (failureCount > 0) {
      console.warn(`Failed updating ${failureCount} `)
    }
  }
}

// Maximum batch size to query for
const limit = Number(Config.get('MIGRATION_DOCUMENTS_LIMIT')) || 500
let successCount = 0
let failureCount = 0
main().then(() => console.log('Script Complete \n'))
