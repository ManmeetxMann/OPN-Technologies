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

const timeZone = Config.get('DEFAULT_TIME_ZONE')
const makeTimeEndOfTheDay = (datetime: moment.Moment): string => {
  return datetime.hours(11).minutes(59).format()
}
export const makeDeadline = (utcDateTime: moment.Moment): string => {
  const tzDateTime = utcDateTime.clone().tz(timeZone)
  const deadline = makeTimeEndOfTheDay(
    tzDateTime.hours() > 12 ? tzDateTime.add(1, 'd') : tzDateTime,
  )
  return deadline
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
    //hasMore = !testResultSnapshot.empty
    hasMore = false

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

  if (!appointmentInDb) {
    console.warn(`AcuityAppointmentId: ${legacyTestResult.appointmentId} doesn't exists`)
    return Promise.reject()
  }

  try {
    const pcrTestResult = database.collection('pcr-test-results').add({
      appointmentId: legacyTestResult.appointmentId,
      barCode: legacyTestResult.barCode,
      dateOfAppointment: legacyTestResult.dateOfAppointment,
      displayForNonAdmins: true,
      firstName: legacyTestResult.firstName,
      lastName: legacyTestResult.lastName,
      organizationId: legacyTestResult.organizationId,
      result: legacyTestResult.result,
      linkedBarCodes: [],
      deadline: makeDeadline(moment(legacyTestResult.dateTime)),
      resultSpecs: {
        action: 'SendThisResult',
        autoResult: legacyTestResult.result,
        barCode: legacyTestResult.barCode,
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
      waitingResult: false,
    })
    const pcrTestResultData = await pcrTestResult
    
    if(pcrTestResultData.id){
      console.info(`Successfully Copied results for ${legacyTestResultId} to ${pcrTestResultData.id}`)
      return pcrTestResult
    }
    console.warn(`Failed to Save pcrTestResult`)
    return Promise.reject()
  } catch (error) {
    console.warn(error)
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
const limit = Number(Config.get('MIGRATION_DOCUMENTS_LIMIT')) || 5
let successCount = 0
let failureCount = 0
main().then(() => console.log('Script Complete \n'))
