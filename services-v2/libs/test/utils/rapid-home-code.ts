import {FirebaseManager} from '@opn-services/common/services/firebase/firebase.service'

import {firestore} from 'firebase-admin'

const collectionName = 'rapid-home-kit-codes'

FirebaseManager.getInstance()
const database = firestore()

export const createRapidTestKitCode = async (
  dataOverwrite: {
    id: string
    code: string
  },
  testDataCreator: string,
): Promise<void> => {
  const data = {
    id: dataOverwrite.id,
    code: dataOverwrite.code,
    printed: true,
    printedOn: new Date(),
    testDataCreator,
  }

  await database
    .collection(collectionName)
    .doc(dataOverwrite.id)
    .set(data)
}

export const clearRapidCodeDataById = async (id: string): Promise<void> => {
  const userCollection = database.collection(collectionName)
  await userCollection.doc(id).update({
    usedForUserIds: [],
  })
}

export const deleteRapidCodeByIdTestDataCreator = async (
  id: string,
  testDataCreator: string,
): Promise<void> => {
  const userCollection = database.collection(collectionName)
  const ref = await userCollection
    .where('id', '==', id)
    .where('testDataCreator', '==', testDataCreator)
    .get()
  const deleteDocs = ref.docs.map(doc => doc.ref.delete())
  await Promise.all(deleteDocs)
}

export const deleteRapidCodeById = async (id: string): Promise<void> => {
  const userCollection = database.collection(collectionName)
  const ref = await userCollection.where('id', '==', id).get()
  const deleteDocs = ref.docs.map(doc => doc.ref.delete())
  await Promise.all(deleteDocs)
}
