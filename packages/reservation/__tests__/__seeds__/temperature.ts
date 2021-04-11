import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'temperature'
export const createTemperature = async (dataOverwrite: {
  id: string
  createdAt: string
  organizationID: string
  userID: string
}): Promise<void> => {
  const data = {
    organizationId: dataOverwrite.organizationID,
    status: 'proceed',
    temperature: 37.1,
    timestamps: {
      createdAt: firestore.Timestamp.fromDate(new Date(dataOverwrite.createdAt)),
      updatedAt: null,
    },
    userId: dataOverwrite.userID,
  }

  await database.collection(collectionName).doc(dataOverwrite.id).set(data)
  //console.log(`savedData.id: ${savedData}`)
}

export const deleteTemperatureByDateTime = async (dateTime: string): Promise<void> => {
  const appointments_query = database
    .collection(collectionName)
    .where('timestamps.createdAt', '<=', firestore.Timestamp.fromDate(new Date(dateTime)))
  await appointments_query.get().then(function (querySnapshot) {
    querySnapshot.forEach(function (doc) {
      doc.ref.delete()
    })
  })
}

export const deleteAllTemperatureByUserId = async (
  userId: string,
  testDataCreator: string,
): Promise<void> => {
  const temperatureCollection = database.collection(collectionName)
  const ref = await temperatureCollection
    .where('userId', '==', userId)
    .where('testDataCreator', '==', testDataCreator)
    .get()
  const deleteAll = ref.docs.map((doc) => doc.ref.delete())
  await Promise.all(deleteAll)
}
