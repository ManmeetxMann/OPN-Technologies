import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'labs'
export const create = async (dataOverwrite: {
  id: string
  createdAt: string
  userID: string
}): Promise<void> => {
  const data = {
    name: 'Lab1',
    isIntegration: true,
    timestamps: {
      createdAt: firestore.Timestamp.fromDate(new Date(dataOverwrite.createdAt)),
      updatedAt: null,
    },
  }

  await database.collection(collectionName).doc(dataOverwrite.id).set(data)
  //console.log(`savedData.id: ${savedData}`)
}

export const deleteAll = async (): Promise<void> => {
  const appointments_query = database.collection(collectionName).where('isIntegration', '==', true)
  await appointments_query.get().then(function (querySnapshot) {
    querySnapshot.forEach(function (doc) {
      doc.ref.delete()
    })
  })
}
