/**
 * This script moves authUserId from user.admin.authuserId to user.authUserId
 * If users have two authUserId values, they will use their non-admin value
 * After this migration is run, admin.authUserId will not be defined anywhere
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const DRY_RUN = true

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
console.log(serviceAccount.project_id)
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
    //hasMore = false
    const promises = []
    for (const snapshot of usersSnapshot.docs) {
      if (snapshot.data()?.admin) {
        //User is admin
        promises.push(moveAuthAndEmailId(snapshot))
      }
    }
    const result = await promiseAllSettled(promises)
    results.push(...result)
  }
  return results
}

async function moveAuthAndEmailId(
  userSnapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>,
) {
  const user = userSnapshot.data()
  const userId = userSnapshot.id
  const {admin, authUserId} = user
  const adminAuthUserId = admin.authUserId

  const handleAuthUserId = () => {
    if (!adminAuthUserId) {
      console.log(`NoAdminAuthUserId: UserID: ${userId}`)
      return authUserId
    }

    if (!authUserId) {
      console.log(`MovingAdminAuthUserIdToRoot: UserID: ${userId}`)
      return adminAuthUserId
    } else if (!!authUserId) {
      if (authUserId !== adminAuthUserId) {
        console.warn(`ReplacingAuthUserId With AdminAuthUserID: UserID: ${userId}`)
        return adminAuthUserId
      }
      //Same AdminAUthUser and AuthUSerID
      console.log(`NoImpactAuthUserUpdate: UserID: ${userId}`)
      return adminAuthUserId
    }
  }

  const handleEmail = () => {
    if (!admin.email) {
      console.warn(`NoAdminEmailAddress: UserID: ${userId}`)
      return user.email
    }

    if (!user.email) {
      console.log(`MovingAdminEmailToRoot: UserID: ${userId}`)
      return admin.email
    } else if (user.email) {
      if (user.email !== admin.email) {
        console.warn(`ReplacingAdminEmailToRoot: UserID: ${userId}`)
        return admin.email
      }
      console.log(`NoImpactEmailUpdate: UserID: ${userId}`)
      return admin.email
    }
  }

  const authUserIdToUpdate = handleAuthUserId()
  const email = handleEmail()
  const userByEmail = await database.collection('users').where('email', '==', email).get()

  if (userByEmail.size > 0 && email !== user.email) {
    console.warn(`DuplicateUserEmail: ${email} already exists. UserID: ${userId} Ignored`)
    return Promise.resolve()
  }

  const data = {
    authUserId: authUserIdToUpdate,
    email: email,
    timestamps: {
      updatedAt: firestore.FieldValue.serverTimestamp(),
      migrations: {
        adminAuthIdMigrations: firestore.FieldValue.serverTimestamp(),
      },
    },
  }

  if (user.authUserId && authUserIdToUpdate !== user.authUserId) {
    data['oldAuthUserId'] = user.authUserId ?? null
  }

  if (user.email && email !== user.email) {
    data['oldEmail'] = user.email ?? null
  }

  if (!DRY_RUN) {
    console.log(`UpdatingToDB: UserID: ${userId} Data: ${JSON.stringify(data)}`)

    return userSnapshot.ref.set(data, {
      merge: true,
    })
  } else {
    console.log(`WillBeUpdatedToDB: UserID: ${userId} Data: ${JSON.stringify(data)}`)
  }
  return Promise.resolve()
}

async function main() {
  try {
    console.log(`Migration Starting with DRY_RUN: ${DRY_RUN}`)

    const results = await updateAllUsers()
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

    console.log(`Succesfully updated ${successCount} `)
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    console.warn(`Failed updating ${failureCount} `)
    console.log(`Total User Processed: ${totalCount} `)
  }
}

// Maximum batch size to query for
const limit = Number(Config.get('MIGRATION_DOCUMENTS_LIMIT')) || 500
let successCount = 0
let failureCount = 0
let totalCount = 0
main().then(() => console.log('Script Complete \n'))
