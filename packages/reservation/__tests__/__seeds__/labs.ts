import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'labs'
export const create = async (
  dataOverwrite: {
    id: string
    createdAt: string
    userID: string
  },
  testDataCreator: string,
): Promise<void> => {
  const data = {
    name: 'Lab1',
    timestamps: {
      createdAt: firestore.Timestamp.fromDate(new Date(dataOverwrite.createdAt)),
      updatedAt: null,
    },
    testDataCreator,
  }

  await database.collection(collectionName).doc(dataOverwrite.id).set(data)
  //console.log(`savedData.id: ${savedData}`)
}

export const deleteLabsByTestDataCreator = async (testDataCreator: string): Promise<void> => {
  const query = database.collection(collectionName).where('testDataCreator', '==', testDataCreator)
  await query.get().then(function (querySnapshot) {
    querySnapshot.forEach(function (doc) {
      doc.ref.delete()
    })
  })
}

export const deleteLabsByName = async (labName: string): Promise<void> => {
  const snapshot = await database.collection(collectionName).where('name', '==', labName).get()
  const deletePromises = snapshot.docs.map(async (doc) => doc.ref.delete())
  await Promise.all(deletePromises)
}
