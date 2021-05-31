import {FirebaseManager} from '@opn-services/common/services/firebase/firebase.service'

import {firestore} from 'firebase-admin'

const collectionName = 'appointments'

FirebaseManager.getInstance()
const database = firestore()

export const deleteAppointmentsById = async (id: string): Promise<void> => {
  const userCollection = database.collection(collectionName)
  const ref = await userCollection.where('userId', '==', id).get()
  const deleteDocs = ref.docs.map(doc => doc.ref.delete())
  await Promise.all(deleteDocs)
}
