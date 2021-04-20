import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'attestations'

export const createAttestation = async (
  dataOverwrite: {
    id: string
    userId: string
    questionnaireId: string
    organizationId: string
  },
  testDataCreator: string,
): Promise<void> => {
  const data = {
    answers: [
      {
        0: false,
        1: null,
      },
      {
        0: false,
        1: null,
      },
      {
        0: false,
        1: null,
      },
      {
        0: false,
        1: null,
      },
      {
        0: false,
        1: null,
      },
      {
        0: false,
        1: null,
      },
      {
        1: null,
        0: false,
      },
      {
        0: false,
        1: null,
      },
      {
        0: false,
        1: null,
      },
      {
        0: false,
        1: null,
      },
      {
        1: null,
        0: false,
      },
      {
        0: false,
        1: null,
      },
      {
        0: false,
        1: null,
      },
    ],
    appliesTo: [dataOverwrite.userId],
    attestationTime: firestore.Timestamp.fromDate(new Date()),
    locationId: 'IT_locationId_1',
    organizationId: dataOverwrite.organizationId || '',
    questionnaireId: dataOverwrite.questionnaireId || '',
    status: 'proceed',
    userId: dataOverwrite.userId,
    testDataCreator,
  }

  await database.collection(collectionName).doc(dataOverwrite.id).set(data)
}

export const deleteAttestationsById = async (
  id: string,
  testDataCreator: string,
): Promise<void> => {
  const attestationsCollection = database.collection(collectionName)
  const ref = await attestationsCollection
    .where('id', '==', id)
    .where('testDataCreator', '==', testDataCreator)
    .get()
  const deleteAll = ref.docs.map((doc) => doc.ref.delete())
  await Promise.all(deleteAll)
}
