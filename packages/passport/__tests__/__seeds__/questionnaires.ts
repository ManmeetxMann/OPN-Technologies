import {firestore} from 'firebase-admin'

const database = firestore()
const collectionName = 'questionnaires'

import {OrganizationService} from '../../../enterprise/src/services/organization-service'

const orgService = new OrganizationService()

export const createQuestion = async (
  dataOverwrite: {
    id: string,
  },
  testDataCreator: string,
): Promise<void> => {
  const data = {
    id: dataOverwrite.id,
    questions: {
      '10': {
        value: 'Have you travelled outside of Canada in the past 14 days?',
        answers: [{1: "boolean"}]
      },
      '11': {
        value: 'Has you been identified as a close contact of someone who is confirmed as having COVID-19 by your local public health unit?',
        answers: [{1: "boolean"}]
      },
      '12': {
        value: 'Has you been directed by a health care provider including a public health official to isolate?',
        answers: [{1: "boolean"}]
      },
      '13': {
        answers: [{1: "boolean"}, {2: "datetime"}],
        value: 'Have you tested positive for COVID-19?'
      },
      '09': {
        value: 'Are you experiencing any new or worsening Fatigue, lethargy, muscle aches or malaise (general feeling of being unwell, lack of energy, extreme tiredness, poor feeding in infants) that is unusual or unexplained. Not related to other known causes or conditions (e.g., depression, insomnia, thyroid dysfunction, anemia)',
        answers: [{1: "boolean"}]
      },
      '05': {
        value: 'Are you experiencing any new or worsening Sore throat (painful swallowing or difficulty swallowing)?  Not related to other known causes or conditions (e.g., post nasal drip, gastroesophageal reflux)',
        answers: [{1: "boolean"}]
      },
      '02': {
        value: 'Are you experiencing any new or worsening Cough (more than usual if chronic cough) including croup (barking cough, making a whistling noise when breathing)?  Not related to other known causes or conditions (e.g., asthma, reactive airway)',
        answers: [{1: "boolean"}]
      },
      '06': {
        answers: [{1: "boolean"}],
        value: 'Are you experiencing any new or worsening Stuffy nose and/or runny nose (nasal congestion and/or rhinorrhea)?  Not related to other known causes or conditions (e.g., seasonal allergies, returning inside from the cold, chronic sinusitis unchanged from baseline, reactive airways)'
      },
      '07': {
        value: 'Are you experiencing any new or worsening Headache that is new and persistent, unusual, unexplained, or long-lasting?  Not related to other known causes or conditions (e.g., tension-type headaches, chronic migraines)',
        answers: [{1: "boolean"}]
      },
      '03': {
        value: 'Are you experiencing any new or worsening Shortness of breath (dyspnea, out of breath, unable to breathe deeply, wheeze, that is worse than usual if chronically short of breath)?  Not related to other known causes or conditions (e.g., asthma)',
        answers: [{1: "boolean"}]
      },
      '01': {
        value: 'Are you experiencing any new or worsening Fever and/or Chills (temperature of 37.8°C/100.0°F or greater)?',
        answers: [{1: "boolean"}]
      },
      '04': {
        value: 'Are you experiencing any new or worsening Decrease or loss of smell or taste (new olfactory or taste disorder)?  Not related to other known causes or conditions (e.g., nasal polyps, allergies, neurological disorders)',
        answers: [{1: "boolean"}]
      },
      '08': {
        value: 'Are you experiencing any new or worsening Nausea, vomiting and/or diarrhea?  Not related to other known causes or conditions (e.g. transient vomiting due to anxiety in children, chronic vestibular dysfunction, irritable bowel syndrome, inflammatory bowel disease, side effect of medication)',
        answers: [{1: "boolean"}]
      }
    },
    answerLogic: {
      stop: 100,
      values: [
        2, 2, 2, 2, 1, 1,
        1, 1, 1, 2, 2, 2,
        100
      ],
      caution: 1
    },
    testDataCreator
  }

  await database.collection(collectionName).doc(dataOverwrite.id).set(data)
}

export const deleteQuestionById = async (id: string, testDataCreator: string): Promise<void> => {
  const questionnairesCollection = database.collection(collectionName)
  const ref = await questionnairesCollection
    .where('id', '==', id)
    // .where('testDataCreator', '==', testDataCreator)
    .get()
  const deleteAll = ref.docs.map((doc) => doc.ref.delete())
  await Promise.all(deleteAll)
}
