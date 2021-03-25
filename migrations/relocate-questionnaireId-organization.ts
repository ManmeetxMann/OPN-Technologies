/**
 * Moves organizations/id/location/questionnaireId to organizations questionnaireId
 * Checks if all locations have same questionnaireId before merging
 *
 * TODO:
 * 1. Remove organizations/id/location/questionnaireId after mobile API migration
 */
import * as _ from 'lodash'
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

const DRY_RUN = !Boolean(process.env.RUN_WITH_APPLY)

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
      const locationData = testResult.data()
      results.push(locationData)
    }
  }
  return results
}

async function checkUpdateSubCollection(
  organizations: firestore.QueryDocumentSnapshot<firestore.DocumentData>,
) {
  const organizationsId = organizations.id
  const subCollections = await getSubCollections(organizationsId)
  const questionnaireIdMap = _.countBy(subCollections, 'questionnaireId')
  const questionnaireIdKeys = Object.keys(questionnaireIdMap)

  // Only if all locations have same questionnaire
  let questionnaireId = null
  if (questionnaireIdKeys.length === 1) {
    questionnaireId = questionnaireIdKeys[0]
  }

  // moveQuestionnaireId
  console.log(`Updating organizationId: ${organizations.id}, questionnaireId:${questionnaireId}`)
  if (!DRY_RUN) {
    await organizations.ref.update({questionnaireId})
    successUpdateCount++
  }
  return {questionnaireIdMap, questionnaireId, organizationsId}
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
      promises.push(checkUpdateSubCollection(organizations)),
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
    if (result.value) {
      successCount += 1
    }
    const questionnaireIdMap = result.value.questionnaireIdMap
    const organizationsId = result.value.organizationsId
    const questionnaireCount = Object.keys(questionnaireIdMap).length

    if (questionnaireCount == 0) {
      console.log(`OrganizationId: ${organizationsId} doesn't have questionnaireId in locations`)
      invalidQuestionnaire++
    } else if (questionnaireCount >= 2) {
      console.log(
        `OrganizationId: ${organizationsId} has different questionnaireId in locations: ${JSON.stringify(
          questionnaireIdMap,
        )}`,
      )
      invalidQuestionnaire++
    }
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
    console.log(`Invalid questionnaire ${invalidQuestionnaire} `)
  } catch (error) {
    console.error('Error running migration', error)
  } finally {
    console.warn(`Failed ${failureCount} `)
    console.log(`Total Organizations Processed: ${totalCount} `)
  }
}

// Status
let successCount = 0
let successUpdateCount = 0
let failureCount = 0
let totalCount = 0
let invalidQuestionnaire = 0
// Maximum batch size to query for
const limit = 50

main().then(() => console.log('Script Complete \n'))
