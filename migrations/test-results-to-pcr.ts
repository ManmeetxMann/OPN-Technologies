/**
 * This script to copy Test Results to PCR Results Collection
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'
import moment from 'moment-timezone'

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

export const makeFirestoreTimestamp = (date: Date): firestore.Timestamp => {
  return firestore.Timestamp.fromDate(date)
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
      .collection('test-results')
      .offset(offset)
      .limit(limit)
      .get()

    offset += testResultSnapshot.docs.length
    hasMore = !testResultSnapshot.empty
    //hasMore = false

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
  const legacyTestResultId = snapshot.id
  const legacyTestResult = snapshot.data()
  const appointmentInDb = await database
    .collection('appointments')
    .where('acuityAppointmentId', '==', legacyTestResult.appointmentId)
    .get()

  if (!appointmentInDb || appointmentInDb.docs.length == 0) {
    console.warn(`AcuityAppointmentId: ${legacyTestResult.appointmentId} doesn't exists`)
    return Promise.reject()
  }

  if (appointmentInDb.docs.length > 1) {
    console.warn(`AppointmentID: ${legacyTestResult.appointmentId} exists multiple times`)
    return Promise.reject()
  }

  //Only Single Appointment
  const appointment = appointmentInDb.docs[0]
  const pcrResult =
    legacyTestResult.result === '2019-nCoV Detected' ? 'Positive' : legacyTestResult.result
  try {
    const convertedDeadline = appointment.data().deadline._seconds
      ? appointment.data().deadline
      : makeFirestoreTimestamp(moment(appointment.data().deadline).toDate())
    const pcrTestResult = await database.collection('pcr-test-results').add({
      appointmentId: appointment.id,
      barCode: legacyTestResult.barCode,
      dateOfAppointment: legacyTestResult.dateOfAppointment,
      displayForNonAdmins: true,
      firstName: legacyTestResult.firstName,
      lastName: legacyTestResult.lastName,
      organizationId: legacyTestResult.organizationId,
      result: pcrResult,
      linkedBarCodes: [],
      deadline: convertedDeadline,
      resultSpecs: {
        action: 'SendThisResult',
        autoResult: pcrResult,
        calRed61Ct: legacyTestResult.calRed61Ct,
        calRed61RdRpGene: legacyTestResult.calRed61RdRpGene,
        famCt: legacyTestResult.famCt,
        famEGene: legacyTestResult.famEGene,
        hexCt: legacyTestResult.hexCt,
        hexIC: legacyTestResult.hexIC,
        notify: true,
        quasar670Ct: legacyTestResult.quasar670Ct,
        quasar670NGene: legacyTestResult.quasar670NGene,
        resultDate: legacyTestResult.resultDate,
      },
      timestamps: {
        createdAt: legacyTestResult.timestamps.createdAt,
        updatedAt: legacyTestResult.timestamps.updatedAt,
        migrations: {
          testResultsToPCRResults: firestore.FieldValue.serverTimestamp(),
        },
      },
      updatedAt: legacyTestResult.timestamps.updatedAt | legacyTestResult.timestamps.createdAt,
      waitingResult: false,
    })
    //Update Appointments
    updateAppointment(appointment, pcrResult)
    if (pcrTestResult.id) {
      console.info(`Successfully Copied results for ${legacyTestResultId} to ${pcrTestResult.id}`)
      return Promise.resolve()
    }
    console.warn(`Failed to Save pcrTestResult`)
    return Promise.reject()
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
