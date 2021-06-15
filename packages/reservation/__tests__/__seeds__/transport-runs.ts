import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'transport-runs'

export const deleteTesttestRuns = async (testRunName: string): Promise<void> => {
  const testRuns_query = database.collection(collectionName).where('name', '==', testRunName)

  await testRuns_query.get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => doc.ref.delete())
  })
}

export const fetchExistingLabId = async (): Promise<string> => {
  const labsQuery = database.collection('labs')

  const querySnapshot = await labsQuery.get()
  return querySnapshot.docs[0].id
}
