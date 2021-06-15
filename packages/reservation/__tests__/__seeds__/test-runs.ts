import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'test-runs'

export const deleteTestRuns = async (testRunName: string): Promise<void> => {
  const testRuns_query = database.collection(collectionName).where('name', '==', testRunName)

  const querySnapshot = await testRuns_query.get()
  querySnapshot.forEach((doc) => doc.ref.delete())
}

export const fetchExistingLabId = async (): Promise<string> => {
  const labsQuery = database.collection('labs')

  const querySnapshot = await labsQuery.get()
  return querySnapshot.docs[0].id
}
