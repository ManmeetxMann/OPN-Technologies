/**
 * This script to add labid for all appointments till date
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

async function updateTransportRun(): Promise<Result[]> {
  let offset = 0
  let hasMore = true

  const results: Result[] = []

  while (hasMore) {
    const transportRunSnapshot = await database
      .collection('transport-runs')
      .offset(offset)
      .limit(limit)
      .get()

    offset += transportRunSnapshot.docs.length
    hasMore = !transportRunSnapshot.empty
    //hasMore = false

    for (const transportRun of transportRunSnapshot.docs) {
      const promises = []
      promises.push(addLabId(transportRun))
      const result = await promiseAllSettled(promises)
      results.push(...result)
    }
  }
  return results
}

async function addLabId(snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>) {
  const updateData = async (record) => {
    const data = {}
    if (!record.data().labId) {
      data['labId'] = 'H3O3Fa1lQj8q5C8LLRzt'
    }
    if (!isEmpty(data)) {
      await record.ref.set(
        {
          ...data,
          timestamps: {
            migrations: {
              transportRunAddLabId: firestore.FieldValue.serverTimestamp(),
            },
          },
        },
        {
          merge: true,
        },
      )
      console.log(`Successfully updated Transport Runs: ${record.id}`)
      return 'Updated'
    }
    return
  }

  try {
    return updateData(snapshot)
  } catch (error) {
    console.warn(error)
    throw error
  }
}

async function main() {
  try {
    console.log(`Migration Starting Time: ${new Date()}`)
    const results = await updateTransportRun()
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
    console.log(`Successfully updated ${successCount} `)
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    console.warn(`Failed updating ${failureCount} `)
    console.log(`Total Processed: ${totalCount} `)
  }
}

// Maximum batch size to query for
let successCount = 0
let failureCount = 0
let totalCount = 0
const limit = 50

main().then(() => console.log('Script Complete \n'))
