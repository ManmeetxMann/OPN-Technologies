/**
 * This script just overwrite Config Approvals Emails in user collections so that no notfication is sent by mistake
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})

const database = firestore()

export async function promiseAllSettled(
  promises: Promise<unknown>[],
): Promise<({status: string; value: unknown} | {status: string; reason: unknown})[]> {
  return Promise.all(
    promises.map((promise) =>
      promise
        .then((value) => ({
          status: 'fulfilled',
          value,
        }))
        .catch((error: unknown) => ({
          status: 'rejected',
          reason: error,
        })),
    ),
  )
}

async function updateAllConfigApprovals(): Promise<
  ({status: string; value: unknown} | {status: string; reason: unknown})[]
> {
  let offset = 0
  let hasMore = true

  const results: ({status: string; value: unknown} | {status: string; reason: unknown})[] = []

  while (hasMore) {
    const approvalsSnapshot = await database
      .collection('config/admin/approvals')
      .offset(offset)
      .limit(limit)
      .get()

    offset += approvalsSnapshot.docs.length
    hasMore = !approvalsSnapshot.empty
    console.log(offset)
    for (const approval of approvalsSnapshot.docs) {
      const promises = []
      promises.push(setIsPrivateFlag(approval))
      const result = await promiseAllSettled(promises)
      results.push(...result)
    }
  }
  return results
}

async function setIsPrivateFlag(snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>) {
  const group = snapshot.data()
  
  //return Promise.resolve()
  try {
    return snapshot.ref.set(
      {
        profile: {
          email: 'tester@stayopn.com'
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
    const results = await updateAllConfigApprovals()
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
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
