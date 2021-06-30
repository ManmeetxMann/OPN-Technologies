import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'transport-runs'

export const deleteTransportRuns = async (transportRunLabel: string): Promise<void> => {
  const transportRuns_query = database
    .collection(collectionName)
    .where('label', '==', transportRunLabel)

  await transportRuns_query.get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => doc.ref.delete())
  })
}

export const createTransportRun = async (
  dataOverwrite: {
    id: string
    labId?: string
    label?: string
    createdAt: string
    transportDate: string
    transportDateTime: string
  },
  testDataCreator: string,
): Promise<void> => {
  const data = {
    name: 'transportRun_1',
    transportRunId: dataOverwrite.id,
    driverName: 'transportRun_driver',
    transportDateTime: firestore.Timestamp.fromDate(new Date(dataOverwrite.transportDateTime)),
    transportDate: dataOverwrite.transportDate,
    label: dataOverwrite.label ?? 'transportRun_label',
    labId: dataOverwrite.labId ?? 'testRun_labId',
    timestamps: {
      createdAt: firestore.Timestamp.fromDate(new Date(dataOverwrite.createdAt)),
      updatedAt: null,
    },
    testDataCreator,
  }

  await database.collection(collectionName).doc(dataOverwrite.id).set(data)
}
