import {FirebaseManager} from '@opn-services/common/services/firebase/firebase.service'

import {firestore} from 'firebase-admin'

const collectionName = 'acuity-types'

FirebaseManager.getInstance()
const database = firestore()

const acuityTypes = {
  19422018: {
    name: 'PCR Testing',
    price: '45.00',
  },
}

export const createUpdateAcuityTypes = async (testDataCreator: string): Promise<void> => {
  for (const id of Object.keys(acuityTypes)) {
    await database
      .collection(collectionName)
      .doc(id)
      .set({
        ...acuityTypes[id],
        testDataCreator,
      })
  }
}
