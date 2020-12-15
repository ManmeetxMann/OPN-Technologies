/**
 * Migrate organizations data to organizationsIds in user collection
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

async function updateAllUsers(): Promise<Result[]> {
  let offset = 0
  let hasMore = true

  const results: Result[] = []

  while (hasMore) {
    const usersSnapshot = await database.collection('users').offset(offset).limit(limit).get()

    offset += usersSnapshot.docs.length
    hasMore = !usersSnapshot.empty

    for (const user of usersSnapshot.docs) {
      const promises = []
      promises.push(copyOrganizationsToOrganizationIds(user))
      const result = await promiseAllSettled(promises)
      results.push(...result)
    }
  }
  return results
}

async function copyOrganizationsToOrganizationIds(
  snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>,
) {
  const userId = snapshot.id
  const user = snapshot.data()
  const hasLegacyOrganizatioField = user.hasOwnProperty('organizations')
  const hasOrganizationIdField = user.hasOwnProperty('organizationIds')
  if (hasOrganizationIdField && hasLegacyOrganizatioField) {
    console.warn(`${userId} has both organizations & organizationIds`)
    return Promise.resolve()
  }

  if(hasOrganizationIdField){
    console.info(`${userId} already have organizationIds`)
    //Already have organizationIds
    return Promise.resolve()
  }

  if(!hasLegacyOrganizatioField){
    //No Legacy Fields
    console.warn(`${userId} has no organizations or organizationIds field`)
    return Promise.resolve()
  }

  try {
    console.info(`Updating: ${userId}`)
    return await snapshot.ref.set(
      {
        organizationIds: user.organizations,
        timestamps: {
          migrations:{
            copyOrganizationsToOrganizationIds:firestore.FieldValue.serverTimestamp()
          }
        }
      },
      {
        merge: true,
      },
    )
  } catch (error) {
    console.warn(`Failed: ${userId}`)
    throw error
  }
}

async function main() {
  try {
    console.log('Migration Starting')
    const results = await updateAllUsers()
    results.forEach((result) => {
      totalCount+=1
      if (result.status === ResultStatus.Fulfilled) {
        // @ts-ignore - We will always have a value if the status is fulfilled
        if (result.value) {
          successCount += 1
        }
      } else {
        failureCount += 1
      }
    })

    console.log(`Updated: ${successCount} `)
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    console.log(`Failed: ${failureCount} `)
    console.log(`Total Records Checked: ${totalCount} `)
  }
}

// Maximum batch size to query for
const limit = Number(Config.get('MIGRATION_DOCUMENTS_LIMIT')) || 500
let successCount = 0
let failureCount = 0
let totalCount = 0
main().then(() => console.log('Script Complete \n'))
