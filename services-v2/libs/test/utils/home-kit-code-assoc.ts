import {FirebaseManager} from '@opn-services/common/services/firebase/firebase.service'

import {firestore} from 'firebase-admin'

const collectionName = 'rapid-home-kit-code-to-user-assoc'

FirebaseManager.getInstance()
const database = firestore()

export const createKitAssoc = async (
  dataOverwrite: {
    id: string
    code: string
    userId: string
  },
  testDataCreator: string,
): Promise<void> => {
  const data = {
    id: dataOverwrite.id,
    rapidHomeKitId: dataOverwrite.code,
    userId: dataOverwrite.userId,
    used: false,
    testDataCreator,
  }

  await database
    .collection(collectionName)
    .doc(dataOverwrite.id)
    .set(data)
}

export const deleteHomeKitAssocByIdTestDataCreator = async (
  testDataCreator: string,
): Promise<void> => {
  const homeKitCollection = database.collection(collectionName)
  const ref = await homeKitCollection.where('testDataCreator', '==', testDataCreator).get()
  const deleteDocs = ref.docs.map(doc => doc.ref.delete())
  await Promise.all(deleteDocs)
}

export const deleteHomeKitAssocByKitCode = async (rapidHomeKitId: string): Promise<void> => {
  const homeKitCollection = database.collection(collectionName)
  const ref = await homeKitCollection.where('rapidHomeKitId', '==', rapidHomeKitId).get()
  const deleteDocs = ref.docs.map(doc => doc.ref.delete())
  await Promise.all(deleteDocs)
}
