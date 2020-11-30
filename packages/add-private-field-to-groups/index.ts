import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../common/src/utils/config'

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

async function verifyMigration(): Promise<void> {
  let offset = 0
  let hasMore = true
  let allVerifiedGroupLength = 0
  const failedGroups: string[] = []

  while (hasMore) {
    const organizationSnapshot = await database
      .collection('organizations')
      .offset(offset)
      .limit(limit)
      .get()

    offset += organizationSnapshot.docs.length
    hasMore = !organizationSnapshot.empty

    for (const organization of organizationSnapshot.docs) {
      let groupOffset = 0
      let groupHasMore = true

      while (groupHasMore) {
        const groupSnapshots = await database
          .collection('organizations')
          .doc(organization.id)
          .collection('organization_groups')
          .offset(groupOffset)
          .limit(limit)
          .get()

        groupOffset += groupSnapshots.docs.length
        groupHasMore = !groupSnapshots.empty
        allVerifiedGroupLength += groupSnapshots.docs.length

        for (let i = 0; i < groupSnapshots.docs.length; i += 1) {
          if (!groupSnapshots.docs[i].data().hasOwnProperty('isPrivate')) {
            failedGroups.push(groupSnapshots.docs[i].id)
          }
        }
      }
    }
  }

  if (failedGroups) {
    console.error('Migration failed to update groups', JSON.stringify(failedGroups, null, 2))
  }

  console.log(`Verified ${allVerifiedGroupLength} groups`)
}

async function changeAllOrganizationGroup(): Promise<
  ({status: string; value: unknown} | {status: string; reason: unknown})[]
> {
  let offset = 0
  let hasMore = true

  const results: ({status: string; value: unknown} | {status: string; reason: unknown})[] = []

  while (hasMore) {
    const organizationSnapshot = await database
      .collection('organizations')
      .offset(offset)
      .limit(limit)
      .get()

    offset += organizationSnapshot.docs.length
    hasMore = !organizationSnapshot.empty

    for (const organization of organizationSnapshot.docs) {
      let groupOffset = 0
      let groupHasMore = true

      while (groupHasMore) {
        const groupSnapshots = await database
          .collection('organizations')
          .doc(organization.id)
          .collection('organization_groups')
          .offset(groupOffset)
          .limit(limit)
          .get()

        groupOffset += groupSnapshots.docs.length
        groupHasMore = !groupSnapshots.empty

        const promises = []
        for (let i = 0; i < groupSnapshots.docs.length; i += 1) {
          promises.push(setIsPrivateFlag(groupSnapshots.docs[i]))
        }

        const result = await promiseAllSettled(promises)
        results.push(...result)
      }
    }
  }

  return results
}

async function setIsPrivateFlag(snapshot: firestore.QueryDocumentSnapshot<firestore.DocumentData>) {
  const group = snapshot.data()
  // If the isPrivate is already set, do nothing
  if (group.hasOwnProperty('isPrivate')) {
    return Promise.resolve()
  }

  try {
    return snapshot.ref.set(
      {
        ...group,
        isPrivate: false,
        timestamps: {
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
      },
      {merge: true},
    )
  } catch (error) {
    throw error
  }
}

async function main() {
  try {
    console.log('Migration Starting')
    const results = await changeAllOrganizationGroup()
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

    console.log(`Succesfully updated ${successCount} groups`)
    await verifyMigration()
    console.log('Migration completed successfully')
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    if (failureCount > 0) {
      console.warn(`Failed updating ${failureCount} groups`)
    }
  }
}

// Maximum batch size to query for
const limit = Number(Config.get('MIGRATION_DOCUMENTS_LIMIT')) || 500
let successCount = 0
let failureCount = 0
main().then(() => console.log('Script Complete \n'))
