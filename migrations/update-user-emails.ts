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
  'fulfilled',
  'rejected'
}

type Result = {
  status: ResultStatus
  value: unknown
}

export async function promiseAllSettled(
  promises: Promise<unknown>[],
): Promise<Result[]> {
  return Promise.all(
    promises.map((promise) =>
      promise
        .then((value) => ({
          status: ResultStatus.fulfilled,
          value,
        }))
        .catch((error: unknown) => ({
          status: ResultStatus.rejected,
          value: error,
        })),
    ),
  )
}
async function updateAllUsers(): Promise<Result[]
> {
  let offset = 0
  let hasMore = true

  const results: Result[] = []

  while (hasMore) {
    const approvalsSnapshot = await database
      .collection('users')
      .offset(offset)
      .limit(limit)
      .get()

    offset += approvalsSnapshot.docs.length
    hasMore = !approvalsSnapshot.empty

    for (const approval of approvalsSnapshot.docs) {
      const promises = []
      promises.push(replaceProdEmailWithTestEmail(approval))
      const result = await promiseAllSettled(promises)
      results.push(...result)
    }
  }
  return results
}

async function replaceProdEmailWithTestEmail(snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>) {
  const user = snapshot.data()

  if (!user.hasOwnProperty('admin')) {
    return Promise.resolve()
  }
  
  if(user.admin.email.indexOf('@stayopn.com') != -1){
    return Promise.resolve()
  }

  try {
    return await snapshot.ref.set(
      {
        admin: {
          email: "tester@stayopn.com"
        }
      },
      {
        merge: true
      },
    )
  } catch (error) {
    throw error
  }
}

async function main() {
  try {
    console.log('Migration Starting')
    const results = await updateAllUsers()
    results.forEach((result) => {
      if (result.status === ResultStatus.fulfilled) {
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
