import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'pulse-oxygen'

export const deleteAllPulseOxygenByUserId = async (userId: string): Promise<void> => {
  const pulseOxygenCollection = database.collection(collectionName)
  const ref = await pulseOxygenCollection.where('userId', '==', userId).get()
  const deleteAll = ref.docs.map((doc) => doc.ref.delete())
  await Promise.all(deleteAll)
}
