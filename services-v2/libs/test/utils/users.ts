import {FirebaseManager} from '@opn-services/common/services/firebase/firebase.service'

import {firestore} from 'firebase-admin'

const collectionName = 'users'

FirebaseManager.getInstance()
const database = firestore()

export const createUser = async (
  dataOverwrite: {
    id: string
    organizationIds: string[]
  },
  testDataCreator: string,
): Promise<void> => {
  const data = {
    id: dataOverwrite.id,
    registrationId: null,
    firstName: 'Test',
    lastName: 'Test',
    dateOfBirth: '2021-01-01',
    base64Photo: '',
    organizationIds: dataOverwrite.organizationIds,
    email: 'Test@mail.com',
    admin: null,
    authUserId: dataOverwrite.id,
    delegates: [],
    agreeToConductFHHealthAssessment: true,
    shareTestResultWithEmployer: true,
    readTermsAndConditions: true,
    receiveNotificationsFromGov: true,
    timestamps: {
      createdAt: firestore.Timestamp.fromDate(new Date()),
      updatedAt: null,
    },
    testDataCreator,
  }

  await database
    .collection(collectionName)
    .doc(dataOverwrite.id)
    .set(data)
}

export const deleteUserByIdTestDataCreator = async (
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

export const deleteUserById = async (id: string): Promise<void> => {
  const userCollection = database.collection(collectionName)
  const ref = await userCollection.where('id', '==', id).get()
  const deleteDocs = ref.docs.map(doc => doc.ref.delete())
  await Promise.all(deleteDocs)
}
