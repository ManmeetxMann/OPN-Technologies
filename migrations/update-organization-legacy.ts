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
    const organizationsSnapshot = await database
      .collection('organizations')
      .offset(offset)
      .limit(limit)
      .get()

    offset += organizationsSnapshot.docs.length
    hasMore = !organizationsSnapshot.empty

    for (const organization of organizationsSnapshot.docs) {
      const promises = []
      promises.push(setOrganizationLegacyValue(organization))
      const result = await promiseAllSettled(promises)
      results.push(...result)
    }
  }
  return results
}

async function setOrganizationLegacyValue(
  snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>,
) {
  const organizationId = snapshot.id
  const organization = snapshot.data()

  try {
    console.info(`Updating: ${organizationId}`)
    return await snapshot.ref.set(
      {
        legacyMode: organization.allowDependants,
        timestamps: {
          migrations: {
            updateOrganizationLegacy: firestore.FieldValue.serverTimestamp(),
          },
        },
      },
      {
        merge: true,
      },
    )
  } catch (error) {
    console.warn(`Failed: ${organizationId}`)
    throw error
  }
}

async function main() {
  try {
    console.log('Migration Starting')
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
