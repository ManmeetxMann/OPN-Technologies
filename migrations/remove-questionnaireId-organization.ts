/**
 * Removed questionnaireId field in organizations/location
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const DRY_RUN = true

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

/**
 * Reads all organizations locations
 */
async function getSubCollections(organizationId: string) {
  let offset = 0
  let hasMore = true
  const results = []
  while (hasMore) {
    const subCollections = await database
      .collection('organizations')
      .doc(organizationId)
      .collection('locations')
      .offset(offset)
      .limit(limit)
      .get()

    offset += subCollections.docs.length
    hasMore = !subCollections.empty
    // hasMore = false

    for (const testResult of subCollections.docs) {
      const locationData = testResult
      results.push(locationData)
    }
  }
  return results
}

/**
 * Remove a field questionnaireId from locations
 */
async function removeQuestionnaireIdromSubCollection(
  organizations: firestore.QueryDocumentSnapshot<firestore.DocumentData>,
) {
  const organizationsId = organizations.id
  const subCollections = await getSubCollections(organizationsId)

  subCollections.forEach(async (subCollection) => {
    if (!DRY_RUN) {
      console.log(
        `Removing questionnaireId field from organizationId: ${organizations.id}, locationId: ${subCollection.id}`,
      )
      await subCollection.ref.update({questionnaireId: firestore.FieldValue.delete()})
      successUpdateCount++
    } else {
      console.log(
        `Going to removing questionnaireId field from organizationId: ${organizations.id}, locationId: ${subCollection.id}`,
      )
    }
  })
}

async function updateOrganizations(): Promise<Result[]> {
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
    // hasMore = false

    const promises = []
    organizationsSnapshot.docs.forEach((organizations) =>
      promises.push(removeQuestionnaireIdromSubCollection(organizations)),
    )
    const result = await promiseAllSettled(promises)
    results.push(...result)
  }

  return results
}

function logCountMigrationIssue(result) {
  totalCount++
  if (result.status === ResultStatus.Fulfilled) {
    // @ts-ignore - We will always have a value if the status is fulfilled
    successCount += 1
  } else {
    failureCount += 1
  }
}

async function main() {
  try {
    console.log(`Migrate Dependents for GCP projectId: ${serviceAccount.project_id}`)
    console.log(`Migration Starting with DRY_RUN: ${DRY_RUN}`)

    const results = await updateOrganizations()
    results.forEach(logCountMigrationIssue)

    console.log(`Succesfully processed ${successCount} `)
    console.log(`Succesfully updated ${successUpdateCount} `)
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    console.error(`Failed ${failureCount} `)
    console.log(`Total Organizations Processed: ${totalCount} `)
  }
}

// Status
let successCount = 0
let successUpdateCount = 0
let failureCount = 0
let totalCount = 0
// Maximum batch size to query for
const limit = 50

main().then(() => console.log('Script Complete \n'))
