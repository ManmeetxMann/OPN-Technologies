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
      if (snapshot.data().admin?.authUserId) {
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
  const userId = userSnapshot.id
  const {admin, authUserId} = user
  if (!authUserId) {
    //No User AuthUserId
    if (!admin.email) {
      console.warn(`NoAdminEmail: UserID: ${userId}, admin (${admin.authUserId}) has no admin email`)
    }

    if (user.email && admin.email && user.email !== admin.email) {
      console.warn(`UserWithTwoEmails: ${userId}, AdminEmail: ${admin.email} will replace UserEMail: ${user.email}`)
    }

    console.info(`UserWithBlankAuthUserId: ${userId} updating with AdminAuthUserID: ${admin.authUserId} Email: ${admin.email}`)
    if(!DRY_RUN){
      return userSnapshot.ref.set(
        {
          authUserId: admin.authUserId,
          email: admin.email ?? null,
          legacyEmail: user.email ?? null,
        },
        {
          merge: true,
        },
      )
    }
    
  } else {
    // we have two authUserIds, we need to choose
    const sameId = admin.authUserId === authUserId
    if (!sameId) {
      console.warn(
        `UserWithTwoAuthUserId: ${userId} is losing AuthUserId: ${user.authUserId} in favour of AdminAuthUserId: ${admin.authUserId}`,
      )

      if(!DRY_RUN){
        return userSnapshot.ref.set(
          {
            authUserId: admin.authUserId,
            email: admin.email,
            oldAuthUserId: user.authUserId,
            oldEmail: user.email ?? null,
          },
          {
            merge: true,
          },
        )
      }
    }else{
      // same authUserId
      if (user.email && user.email !== admin.email) {
        console.warn(`UserWithOneAuthUserId: ${userId} UserEMail: ${user.email} and AdminEmail: ${admin.email} are both associated to ${authUserId}. Overwritten with AdminEMail.`)
      }else{
        console.warn(`UserWithOneAuthUserId: ${userId} UserEMail: ${user.email} and AdminEmail: ${admin.email} are both Same`)
      }

      if(!DRY_RUN){
        return userSnapshot.ref.set(
          {
            email: admin.email,
          },
          {
            merge: true,
          },
        )
      }
    }
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
