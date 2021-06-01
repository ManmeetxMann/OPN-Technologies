import {FirebaseManager} from '@opn-services/common/services/firebase/firebase.service'

import {firestore} from 'firebase-admin'

const collectionName = 'rapid-home-kit-codes'

FirebaseManager.getInstance()
const database = firestore()

export const createKit = async (
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
    testDataCreator,
  }

  await database
    .collection(collectionName)
    .doc(dataOverwrite.id)
    .set(data)
}

export const deleteHomeKitByIdTestDataCreator = async (testDataCreator: string): Promise<void> => {
  const homeKitCollection = database.collection(collectionName)
  const ref = await homeKitCollection.where('testDataCreator', '==', testDataCreator).get()
  const deleteDocs = ref.docs.map(doc => doc.ref.delete())
  await Promise.all(deleteDocs)
}
