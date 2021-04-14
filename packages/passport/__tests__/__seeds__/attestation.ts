import {firestore} from 'firebase-admin'
import { Attestation } from 'packages/passport/src/models/attestation'

const database = firestore()
const collectionName = 'attestations'

import {AttestationService} from '../../../passport/src/services/attestation-service'
const attestationService = new AttestationService()

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
    // id: dataOverwrite.id,
    // appliesTo: [ dataOverwrite.userId ],
    // organizationId: dataOverwrite.organizationId,
    // answers: [
    //   {
    //     "answer": false,
    //     "additionalValue": "string",
    //     "questionId": 1
    //   },
    //   {
    //     "answer": false,
    //     "additionalValue": "string",
    //     "questionId": 2
    //   },
    //   {
    //     "answer": false,
    //     "additionalValue": "string",
    //     "questionId": 3
    //   },
    //   {
    //     "answer": false,
    //     "additionalValue": "string",
    //     "questionId": 4
    //   },
    //   {
    //     "answer": false,
    //     "additionalValue": "string",
    //     "questionId": 5
    //   },
    //   {
    //     "answer": false,
    //     "additionalValue": "string",
    //     "questionId": 6
    //   },
    //   {
    //     "answer": false,
    //     "additionalValue": "string",
    //     "questionId": 7
    //   },
    //   {
    //     "answer": false,
    //     "additionalValue": "string",
    //     "questionId": 8
    //   },
    //   {
    //     "answer": false,
    //     "additionalValue": "string",
    //     "questionId": 9
    //   },
    //   {
    //     "answer": false,
    //     "additionalValue": "string",
    //     "questionId": 10
    //   },
    //   {
    //     "answer": false,
    //     "additionalValue": "string",
    //     "questionId": 11
    //   },
    //   {
    //     "answer": false,
    //     "additionalValue": "string",
    //     "questionId": 12
    //   },
    //   {
    //     "answer": false,
    //     "additionalValue": "string",
    //     "questionId": 13
    //   }
    // ],
    // locationId: 'IT_location_1',
    // userId: dataOverwrite.userId,
    // status: 'proceed',
    // attestationTime: Date.now().toString(),
    // questionnaireId: dataOverwrite.questionnaireId,
    // testDataCreator,

      answers: [{
          0: false,
          1: null
        }, {
          0: false,
          1: null
        }, {
          0: false,
          1: null
        }, {
          0: false,
          1: null
        }, {
          0: false,
          1: null
        }, {
          0: false,
          1: null
        }, {
          1: null,
          0: false
        }, {
          0: false,
          1: null
        }, {
          0: false,
          1: null
        }, {
          0: false,
          1: null
        }, {
          1: null,
          0: false
        }, {
          0: false,
          1: null
        }, {
          0: false,
          1: null
        }
      ],
      appliesTo: [dataOverwrite.userId],
      attestationTime: firestore.Timestamp.fromDate(new Date()),
      locationId: 'IT_locationId_1',
      organizationId: dataOverwrite.organizationId || '',
      questionnaireId: dataOverwrite.questionnaireId || '',
      status: "proceed",
      userId: dataOverwrite.userId,
      testDataCreator
  }

  await database.collection(collectionName).doc(dataOverwrite.id).set(data)
}

export const deleteAttestationsById = async (id: string, testDataCreator: string): Promise<void> => {
  const attestationsCollection = database.collection(collectionName)
  const ref = await attestationsCollection
    .where('id', '==', id)
    .where('testDataCreator', '==', testDataCreator)
    .get()
  const deleteAll = ref.docs.map((doc) => doc.ref.delete())
  await Promise.all(deleteAll)
}
