import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'pulse-oxygen'

export const createPulseOxygen = async (
  id: string,
  userId: string,
  organizationId: string,
  testDataCreator: string,
): Promise<void> => {
  const pulseOxygenCollection = database.collection(collectionName)
  await pulseOxygenCollection.doc(id).set({
    pulse: 90,
    oxygen: 96,
    organizationId,
    locationId: 'TestLocation',
    userId,
    status: 'Passed',
    timestamps: {
      createdAt: firestore.Timestamp.fromDate(new Date()),
      updatedAt: null,
    },
    testDataCreator,
  })
}

export const deleteAllPulseOxygenByUserId = async (
  userId: string,
  testDataCreator: string,
): Promise<void> => {
  const pulseOxygenCollection = database.collection(collectionName)
  const ref = await pulseOxygenCollection
    .where('userId', '==', userId)
    .where('testDataCreator', '==', testDataCreator)
    .get()
  const deleteAll = ref.docs.map((doc) => doc.ref.delete())
  await Promise.all(deleteAll)
}
