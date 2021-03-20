/**
 * This script to go through all future appointments and fix deadline for results
 */
import {isEmpty} from 'lodash'
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
      .where('dateTime', '>=', firestore.Timestamp.fromDate(new Date('2021-02-01T00:00:00')))
      .offset(offset)
      .limit(limit)
      .get()

    offset += testResultSnapshot.docs.length
    hasMore = !testResultSnapshot.empty
    //hasMore = false

    for (const testResult of testResultSnapshot.docs) {
      const promises = []
      promises.push(fixDeadline(testResult))
      const result = await promiseAllSettled(promises)
      results.push(...result)
    }
  }
  return results
}

async function fixDeadline(snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>) {
  const updatePCRResult = async (pcrResult, resolve) => {
    const updateData = {}
    if (appointmentData.dateTime.seconds !== pcrResult.data().dateTime.seconds) {
      console.log(
        `PCRResultId: ${pcrResult.id} ${
          pcrResult.data().barCode
        }  has different dateTime than appointment ${appointmentData.dateTime.toDate()} ${pcrResult
          .data()
          .dateTime.toDate()}`,
      )
      updateData['dateTime'] = appointmentData.dateTime
    }
    if (appointmentData.deadline.seconds !== pcrResult.data().deadline.seconds) {
      console.log(
        `PCRResultId: ${pcrResult.id} ${
          pcrResult.data().barCode
        } has different deadline than appointment ${appointmentData.deadline.toDate()} ${pcrResult
          .data()
          .deadline.toDate()} `,
      )
      updateData['deadline'] = appointmentData.deadline
    }

    if (!isEmpty(updateData)) {
      await pcrResult.ref.set(
        {
          ...updateData,
          timestamps: {
            migrations: {
              copyDeadlineAndDateTimeFromAppointment: firestore.FieldValue.serverTimestamp(),
            },
          },
        },
        {
          merge: true,
        },
      )
      console.log(`Successfully updated PCRResult: ${pcrResult.id}`)
      return resolve('updated')
    }
    return resolve()
  }

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
    //console.info(`AcuityAppointmentId: ${appointmentId} total results: ${pcrResultInDb.docs.length}`)
    const requests = pcrResultInDb.docs.map((pcrResult) => {
      return new Promise((resolve) => {
        updatePCRResult(pcrResult, resolve)
      })
    })

    const promiseResult = Promise.all(requests).then((value) => {
      return value
    })
    return (await promiseResult).includes('updated')
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
