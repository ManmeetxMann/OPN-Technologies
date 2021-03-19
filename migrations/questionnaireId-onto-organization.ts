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

/**
 * Reads all organizations locations
 */
async function getSubCollections(locations: string) {
  let hasMore = true
  const results = []
  while (hasMore) {
    const subCollections = await database
      .collection('organizations')
      .doc(locations)
      .collection('locations')
      .limit(limit)
      .get()

    let offset = 0
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

/**
 * Finds most used questionnaire in organization locations
 */
function getMostUsedQuestionnaire(questionnaireIdMap) {
  const questionnaireIdKeys = Object.keys(questionnaireIdMap)
  let maxQuestion = 0
  let maxQuestionId = null
  questionnaireIdKeys.forEach((questionnaireId) => {
    const questionsCount = questionnaireIdMap[questionnaireId]
    if (questionsCount > maxQuestion) {
      maxQuestion = questionsCount
      maxQuestionId = questionnaireId
    }
  })
  return maxQuestionId
}

/**
 * For each organization migrates questionnaireId for location to parent
 * 
 * TODO:
 * 1. How to handle if not location and questionnaireId
 */
async function updateOrganizations() {
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const organizationsSnapshot = await database
      .collection('organizations')
      .offset(offset)
      .limit(limit)
      .get()

    offset += organizationsSnapshot.docs.length
    hasMore = !organizationsSnapshot.empty
    // hasMore = false

    for (const organizations of organizationsSnapshot.docs) {
      const subCollections = await getSubCollections(organizations.id)
      const questionnaireIdMap = _.countBy(subCollections, 'questionnaireId')
      const questionnaireIdKeys = Object.keys(questionnaireIdMap)

      let questionnaireId = null
      if (questionnaireIdKeys.length === 0) {
        console.log(`Organization id: ${organizations.id} has no locations`)
      } else if (questionnaireIdKeys.length === 1) {
        console.log('Organization has one questionnaire per location')
        questionnaireId = questionnaireIdKeys[0]
      } else {
        console.log(
          'Organization has more that one questionnaire for locations. Selecting most used.',
        )
        questionnaireId = getMostUsedQuestionnaire(questionnaireIdMap)
        console.log(questionnaireIdMap, questionnaireId)
      }
      console.log(questionnaireId)

      // moveQuestionnaireId
      if (!DRY_RUN) {
        console.log('Updating organizations default questionnaire')
        await organizations.ref.update({questionnaireId})
      }
    }
  }
}

console.log(`Migrate Dependents: ${serviceAccount.project_id}`)
console.log(`DRY_RUN: ${DRY_RUN}`)
async function main() {
  await updateOrganizations()
}

// Maximum batch size to query for
let successCount = 0
let failureCount = 0
let totalCount = 0
const limit = 50

main().then(() => console.log('Script Complete \n'))
