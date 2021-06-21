import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'test-runs-pools'

export const deleteTestRunsPoolsByTestRunId = async (testRunId: string): Promise<void> => {
  const snapshot = await database
    .collection(collectionName)
    .where('testRunId', '==', testRunId)
    .get()

  const deletes = snapshot.docs.map((doc) => doc.ref.delete())
  await Promise.all(deletes)
}
