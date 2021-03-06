import {FirebaseManager} from '@opn-services/common/services/firebase/firebase.service'

import {firestore} from 'firebase-admin'
import {UserCreator} from '@opn-common-v1/data/user'

const collectionName = 'users'

FirebaseManager.getInstance()
const database = firestore()

export const createUser = async (
  dataOverwrite: {
    id: string
    organizationIds: string[]
    email?: string
    firstName?: string
    status?: string
    syncUser?: string
  },
  testDataCreator: string,
): Promise<void> => {
  const data = {
    id: dataOverwrite.id,
    registrationId: null,
    firstName: dataOverwrite.firstName ?? 'Test',
    lastName: 'Test',
    dateOfBirth: '2021-01-01',
    base64Photo: '',
    status: dataOverwrite.status ?? 'CONFIRMED',
    organizationIds: dataOverwrite.organizationIds,
    email: dataOverwrite.email ?? 'Test@mail.com',
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
    creator: dataOverwrite.syncUser ? dataOverwrite.syncUser : UserCreator.syncFromTests,
    testDataCreator,
  }

  await database
    .collection(collectionName)
    .doc(dataOverwrite.id)
    .set(data)
}

export const deleteUserByEmailTestDataCreator = async (email: string): Promise<void> => {
  const userCollection = database.collection(collectionName)
  const ref = await userCollection.where('email', '==', email).get()
  const deleteDocs = ref.docs.map(doc => doc.ref.delete())
  await Promise.all(deleteDocs)
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

export const deleteUserByEmail = async (email: string): Promise<void> => {
  const userCollection = database.collection(collectionName)
  const ref = await userCollection.where('email', '==', email).get()
  const deleteDocs = ref.docs.map(doc => doc.ref.delete())
  await Promise.all(deleteDocs)
}
