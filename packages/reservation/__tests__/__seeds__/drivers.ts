import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'drivers'

export const deleteTestDrivers = async(driverName: string): Promise<void> => {
  const drivers_query = database
    .collection(collectionName)
    .where('name', '==', driverName)

  await drivers_query.get().then(querySnapshot => { querySnapshot.forEach(doc => doc.ref.delete()) })
}