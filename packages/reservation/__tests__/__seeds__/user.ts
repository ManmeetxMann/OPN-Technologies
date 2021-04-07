import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'users'

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
    authUserId: '',
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

  await database.collection(collectionName).doc(dataOverwrite.id).set(data)
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
  const deleteDocs = ref.docs.map((doc) => doc.ref.delete())
  await Promise.all(deleteDocs)
}
