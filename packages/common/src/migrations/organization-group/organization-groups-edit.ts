import {promiseAllSettled} from '../utils/utils'
import {firestore} from 'firebase-admin'

export async function verifyMigration(database: firestore.Firestore, limit: number): Promise<void> {
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
        allVerifiedGroupLength += groupOffset

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

export async function changeAllOrganizationGroup(
  database: firestore.Firestore,
  limit: number,
): Promise<({status: string; value: unknown} | {status: string; reason: unknown})[]> {
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
