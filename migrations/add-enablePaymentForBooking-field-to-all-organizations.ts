/**
 * This script will add enablePaymentForBooking to every organizations if it doesnt exists
 */

import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})
console.log(serviceAccount.project_id)

const database = firestore()

export enum ResultStatus {
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

type Result = {
  status: ResultStatus
  value: unknown
}

async function promiseAllSettled(promises: Promise<unknown>[]): Promise<Result[]> {
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

async function updateOrganizations(): Promise<Result[]> {
  let offset = 0
  let hasMore = true

  const results: Result[] = []

  while (hasMore) {
    const organizationSnapshot = await database
      .collection('organizations')
      .offset(offset)
      .limit(limit)
      .get()

    offset += organizationSnapshot.docs.length
    hasMore = !organizationSnapshot.empty
    //hasMore = false

    const promises = []
    for (const organization of organizationSnapshot.docs) {
      promises.push(updateOrganization(organization))
    }
    const result = await promiseAllSettled(promises)
    results.push(...result)
  }
  return results
}

async function updateOrganization(result: firestore.QueryDocumentSnapshot<firestore.DocumentData>) {
  try {
    const organizationId = result.data().enablePaymentForBooking
    const enablePaymentForBooking = result.data().enablePaymentForBooking
    if (!enablePaymentForBooking) {
      const updateData = {}
      updateData['enablePaymentForBooking'] = true

      await result.ref.set(
        {
          ...updateData,
          timestamps: {
            migrations: {
              enablePaymentForBooking: firestore.FieldValue.serverTimestamp(),
            },
          },
        },
        {
          merge: true,
        },
      )
      console.log(`Successfully updated organizationId: ${result.id}`)
      return 'Updated'
    } else {
      console.log(
        `Already have enablePaymentForBooking: ${enablePaymentForBooking} for organizationId: ${organizationId}`,
      )
    }
    return
  } catch (error) {
    console.warn(error)
    throw error
  }
}

async function main() {
  try {
    console.log(`Migration Starting Time: ${new Date()}`)
    const results = await updateOrganizations()

    results.forEach((result) => {
      totalCount += 1
      if (result.status === ResultStatus.Fulfilled) {
        if (result.value) {
          successCount += 1
        }
      } else {
        console.error(result.value)
        failureCount += 1
      }
    })
    console.log(`Successfully updated ${successCount} `)
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    console.warn(`Failed updating ${failureCount} `)
    console.log(`Total Results Processed: ${totalCount} `)
  }
}

let successCount = 0
let failureCount = 0
let totalCount = 0
const limit = 50

main().then(() => console.log('Script Complete \n'))
