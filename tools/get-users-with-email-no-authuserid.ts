/**
Script to cound total users with email and no authuserID
*/
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})
console.log(`Migrate Organizations: ${serviceAccount.project_id}`)

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

async function checkAllUsers(): Promise<Result[]> {
  let offset = 0
  let hasMore = true

  const results: Result[] = []

  while (hasMore) {
    const usersSnapshot = await database.collection('users').offset(offset).limit(limit).get()

    offset += usersSnapshot.docs.length
    hasMore = !usersSnapshot.empty

    for (const user of usersSnapshot.docs) {
      const promises = []
      promises.push(checkIfUserHasEmailAndNoAuthUserID(user))
      const result = await promiseAllSettled(promises)
      results.push(...result)
    }
  }
  return results
}

async function checkIfUserHasEmailAndNoAuthUserID(
  snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>,
) {
  const userId = snapshot.id
  const user = snapshot.data()
  const hasAuthUserId = user.hasOwnProperty('authUserId')
  const hasEmail = user.hasOwnProperty('email')
  if (hasEmail && !!user.email && !hasAuthUserId && !user.authUserId) {
    console.warn(`${userId} has email but no authUserId`)
    return Promise.reject('has email but no authUserId')
  }
  return Promise.resolve('valid')
}

async function main() {
  try {
    console.log('Starting Validating')
    const results = await checkAllUsers()
    results.forEach((result) => {
      totalCount += 1
      if (result.status === ResultStatus.Fulfilled) {
        // @ts-ignore - We will always have a value if the status is fulfilled
        if (result.value) {
          successCount += 1
        }
      } else {
        failureCount += 1
      }
    })

    console.log(`Good: ${successCount} `)
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    console.log(`NoAutUseIDButEmail: ${failureCount} `)
    console.log(`Total Records Checked: ${totalCount} `)
  }
}

// Maximum batch size to query for
const limit = Number(Config.get('MIGRATION_DOCUMENTS_LIMIT')) || 500
let successCount = 0
let failureCount = 0
let totalCount = 0
main().then(() => console.log('Script Complete \n'))
