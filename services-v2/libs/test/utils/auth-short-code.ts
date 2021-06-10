import {FirebaseManager} from '@opn-services/common/services/firebase/firebase.service'

import {firestore} from 'firebase-admin'

const collectionName = 'auth-short-codes'

FirebaseManager.getInstance()
const database = firestore()

export const getAuthShortCodeByEmail = (
  email: string,
): Promise<FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>> => {
  return database
    .collection(collectionName)
    .where('email', '==', email)
    .limit(1)
    .get()
}
