/**
 * Migrate questionnaireId to Attestation
 */
import {initializeApp, credential, firestore} from 'firebase-admin'
import {Config} from '../packages/common/src/utils/config'

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

console.log(`Migrate Attestation: ${serviceAccount.project_id}`)

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

async function updateAllAttestation(): Promise<Result[]> {
  let offset = 0
  let hasMore = true

  const results: Result[] = []

  const questionnaires = await database.collection('questionnaires').get()

  while (hasMore) {
    const attestationsSnapshot = await database
      .collection('attestation')
      .offset(offset)
      .limit(limit)
      .get()

    offset += attestationsSnapshot.docs.length
    hasMore = !attestationsSnapshot.empty

    for (const attestation of attestationsSnapshot.docs) {
      const promises = []
      promises.push(addQuestionnaireIdToAttestation(attestation, questionnaires.docs))
      const result = await promiseAllSettled(promises)
      results.push(...result)
    }
  }
  return results
}

async function addQuestionnaireIdToAttestation(
  attestation: firestore.QueryDocumentSnapshot<firestore.DocumentData>,
  questionnaires: firestore.QueryDocumentSnapshot<firestore.DocumentData>[],
) {
  if (attestation.data().hasOwnProperty('questionnaireId')) {
    return Promise.resolve()
  }

  const questionnaireSnapshot = questionnaires.find(
    (questionnaire) =>
      Object.keys(attestation.data().answers).length ===
      Object.keys(questionnaire.data().questions).length,
  )

  try {
    console.info(`Updating: ${attestation.id}`)
    return await attestation.ref.set(
      {
        questionnaireId: questionnaireSnapshot.id,
        timestamps: {
          migrations: {
            addQuestionnaireIdToAttestation: firestore.FieldValue.serverTimestamp(),
          },
        },
      },
      {
        merge: true,
      },
    )
  } catch (error) {
    console.warn(`Failed: ${attestation.id}`)
    throw error
  }
}

async function main() {
  try {
    console.log('Migration Starting')
    const results = await updateAllAttestation()
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
