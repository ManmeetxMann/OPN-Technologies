/**
 * This script to go through all appointments and add displayInResult flag to all PCR results.
 * Latest Result will be True
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'
import DBSchema from '../packages/reservation/src/dbschemas/pcr-test-results.schema'
import {PCRTestResultDBModel} from '../packages/reservation/src/models/pcr-test-results'

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
      .offset(offset)
      .limit(limit)
      .get()

    offset += testResultSnapshot.docs.length
    hasMore = !testResultSnapshot.empty
    hasMore = false

    for (const testResult of testResultSnapshot.docs) {
      const promises = []
      promises.push(addDisplayInResultFlag(testResult))
      const result = await promiseAllSettled(promises)
      results.push(...result)
    }
  }
  return results
}

async function addDisplayInResultFlag(
  snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>,
) {
  const resultId = snapshot.id
  const legacyTestResult = snapshot.data()
  const pcrResultInDb = await database
    .collection('pcr-test-results')
    .where('appointmentId', '==', resultId)
    .get()

  if (!pcrResultInDb || pcrResultInDb.docs.length == 0) {
    return Promise.reject(`appointmentId: ${resultId} doesn't have any results`)
  }
  try {
    if (pcrResultInDb.docs.length > 1) {
      console.info(`AcuityAppointmentId: ${resultId} total results: ${pcrResultInDb.docs.length}`)
      //Update Multiple
      const latestResult = pcrResultInDb.docs.reduce(function (lastPCRResult, pcrResult) {
        return lastPCRResult.data().updatedAt.seconds > pcrResult.data().updatedAt.seconds
          ? lastPCRResult
          : pcrResult
      }, pcrResultInDb.docs[0])
      
      pcrResultInDb.docs.forEach((pcrResult)=>{
        pcrResult.ref.set(
          {
            displayInResult: false,
            timestamps: {
              migrations: {
                addFlagForDisplayInResult: firestore.FieldValue.serverTimestamp(),
              },
            },
          },
          {
            merge: true,
          })
      })

      latestResult.ref.set(
        {
          displayInResult: true,
          timestamps: {
            migrations: {
              addFlagForDisplayInResult: firestore.FieldValue.serverTimestamp(),
            },
          },
        },
        {
          merge: true,
        })
    }else{
      console.info(`AcuityAppointmentId: ${resultId} Only One result`)

      const pcrResult = pcrResultInDb.docs[0]
      pcrResult.ref.set(
        {
          displayInResult: true,
          timestamps: {
            migrations: {
              addFlagForDisplayInResult: firestore.FieldValue.serverTimestamp(),
            },
          },
        },
        {
          merge: true,
        })
    }
    return Promise.resolve()
  } catch (error) {
    console.warn(error)
    throw error
  }
}

async function updateAppointment(
  snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>,
  latestResult: string,
) {
  try {
    return await snapshot.ref.set(
      {
        latestResult: latestResult,
        appointmentStatus: 'Reported',
        timestamps: {
          migrations: {
            testResultsToPCRResults: firestore.FieldValue.serverTimestamp(),
          },
        },
      },
      {
        merge: true,
      },
    )
  } catch (error) {
    throw error
  }
}

async function main() {
  try {
    console.log('Migration Starting')
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
