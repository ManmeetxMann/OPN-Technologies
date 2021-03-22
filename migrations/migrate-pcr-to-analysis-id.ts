/**
 * This script to copy Test Results to PCR Results Collection
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
    const pcrResultSnapshot = await database
      .collection('pcr-test-results')
      //.where('resultSpecs', '!=', null)
      .offset(offset)
      .limit(limit)
      .get()

    offset += pcrResultSnapshot.docs.length
    hasMore = !pcrResultSnapshot.empty
    //hasMore = false

    for (const pcrResult of pcrResultSnapshot.docs) {
      const promises = []
      promises.push(updatePcrTestResult(pcrResult))
      const result = await promiseAllSettled(promises)
      results.push(...result)
    }
  }
  return results
}

async function updatePcrTestResult(
  snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>,
) {
  try {
    const resultSpecs = snapshot.data().resultSpecs
    if (!resultSpecs) {
      return Promise.reject(`PCRResultID: ${snapshot.id} Missing Results Specs`)
    }

    await snapshot.ref.set(
      {
        resultAnalysis: [
          {
            label: 'calRed61RdRpGene',
            value: resultSpecs.calRed61RdRpGene,
          },
          {
            label: 'calRed61Ct',
            value: resultSpecs.calRed61Ct,
          },
          {
            label: 'famEGene',
            value: resultSpecs.famEGene,
          },
          {
            label: 'famCt',
            value: resultSpecs.famCt,
          },
          {
            label: 'hexIC',
            value: resultSpecs.hexIC,
          },
          {
            label: 'hexCt',
            value: resultSpecs.hexCt,
          },
          {
            label: 'quasar670NGene',
            value: resultSpecs.quasar670NGene,
          },
          {
            label: 'quasar670Ct',
            value: resultSpecs.quasar670Ct,
          },
        ],
        resultMetaData: {
          action: resultSpecs.action,
          autoResult: resultSpecs.autoResult,
          notify: resultSpecs.notify,
          resultDate: resultSpecs.resultDate,
          comment: resultSpecs.comment ?? null,
        },
        //resultSpecs: firestore.FieldValue.delete(),
        templateId: 'template1',
        labId: 'H3O3Fa1lQj8q5C8LLRzt',
        timestamps: {
          migrations: {
            specsToMetaAnalysis: firestore.FieldValue.serverTimestamp(),
          },
        },
      },
      {
        merge: true,
      },
    )

    console.info(`Successfully Migrated PCR Results ${snapshot.id}`)
    return Promise.resolve(`Successfully Migrated PCR Results ${snapshot.id}`)
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
    console.log(`Total PCR Test Results Processed: ${totalCount} `)
  }
}

// Maximum batch size to query for
let successCount = 0
let failureCount = 0
let totalCount = 0
const limit = 100

main().then(() => console.log('Script Complete \n'))
