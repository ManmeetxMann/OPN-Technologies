/**
 * This script moves authUsserId from user.authuserId to user.admin.authUserId
 * It assumes that all users with authUserIds are meant to be admins
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
async function updateAllUsers(): Promise<Result[]> {
  let offset = 0
  let hasMore = true

  const results: Result[] = []

  while (hasMore) {
    const usersSnapshot = await database.collection('users').offset(offset).limit(limit).get()

    offset += usersSnapshot.docs.length
    hasMore = !usersSnapshot.empty

    const promises = []
    for (const snapshot of usersSnapshot.docs) {
      if (snapshot.data().authUserId) {
        // we filter this outside of the query to avoid an extra index
        // and we don't create promises for records that don't need to update
        promises.push(moveAuthId(snapshot))
      }
    }
    const result = await promiseAllSettled(promises)
    results.push(...result)
  }
  return results
}

async function moveAuthId(userSnapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>) {
  const user = userSnapshot.data()
  const {authUserId} = user
  if (!user.admin?.email) {
    console.warn(`${user.id} is not an admin but has an authUserId`)
    return userSnapshot.ref.set(
      {
        authUserId: firestore.FieldValue.delete(),
        removedAuthUserId: authUserId,
      },
      {
        merge: true,
      },
    )
  }
  return userSnapshot.ref.set(
    {
      admin: {
        authUserId,
      },
      authUserId: firestore.FieldValue.delete(),
    },
    {
      merge: true,
    },
  )
}

async function main() {
  try {
    console.log('Migration Starting')
    const results = await updateAllUsers()
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
