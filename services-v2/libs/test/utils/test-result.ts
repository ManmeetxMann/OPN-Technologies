import {FirebaseManager} from '@opn-services/common/services/firebase/firebase.service'

import {firestore} from 'firebase-admin'
const collectionName = 'pcr-test-results'

FirebaseManager.getInstance()
const database = firestore()

export const getTestResultPayload = (data: {firstName?: string; lastName?: string}): unknown => {
  return {
    firstName: data.firstName ?? 'TestFirstName',
    lastName: data.lastName ?? 'TestLastName',
    dateOfBirth: '2021-01-01',
    postalCode: '10200',
    testResult: 'Positive',
    reportAs: 'Individual',
  }
}

export const findAndRemoveByFirstName = async (firstName: string): Promise<void> => {
  const pcrTestResultCollection = database.collection(collectionName)
  const ref = await pcrTestResultCollection.where('firstName', '==', firstName).get()

  const deleteDocs = ref.docs.map(doc => doc.ref.delete())
  await Promise.all(deleteDocs)
}
