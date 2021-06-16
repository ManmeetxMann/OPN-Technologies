import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'test-runs'

export const deleteTestRuns = async (testRunName: string): Promise<void> => {
  const testRuns_query = database.collection(collectionName).where('name', '==', testRunName)

  const querySnapshot = await testRuns_query.get()
  querySnapshot.forEach((doc) => doc.ref.delete())
}

export const createTestRun = async (
  dataOverwrite: {
    id: string
    name?: string
    createdAt: string
  },
  testDataCreator: string,
): Promise<void> => {
  const data = {
    name: dataOverwrite.name ?? 'testRun_1',
    testRunId: dataOverwrite.id,
    timestamps: {
      createdAt: firestore.Timestamp.fromDate(new Date(dataOverwrite.createdAt)),
      updatedAt: null,
    },
    testDataCreator,
  }

  await database.collection(collectionName).doc(dataOverwrite.id).set(data)
}

export const deleteTestRunsByDataCreator = async (testDataCreator: string): Promise<void> => {
  const test_runs_query = database
    .collection(collectionName)
    .where('testDataCreator', '==', testDataCreator)

  await test_runs_query.get().then(function (querySnapshot) {
    querySnapshot.forEach(function (doc) {
      doc.ref.delete()
    })
  })
}
