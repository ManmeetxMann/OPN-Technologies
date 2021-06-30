import {PassportStatus} from './passport'
import DataModel from '../../../common/src/data/datamodel.base'

export type AttestationAnswers = Record<number, Record<number, boolean | string>>
export type AnswerV1 = {
  questionId: number
  answer: boolean
  additionalValue: string
}

export type AttestationAnswersV1 = AnswerV1[]

export type Attestation = {
  id: string
  answers: AttestationAnswersV1
  userId: string
  // userIds and dependantIds, easier to query this way
  appliesTo: string[]
  locationId: string
  organizationId: string
  questionnaireId: string
  attestationTime: string
  status: PassportStatus
}

export class AttestationModel extends DataModel<Attestation> {
  public readonly rootPath = 'attestations'
  readonly zeroSet = []
}

export const attestationAnswersFromLegacyToV1 = (legacyAnswers: AttestationAnswers): AnswerV1[] => {
  const answersV1 = Object.entries(legacyAnswers).map(([, answer]) => {
    answer['0'] = answer['1']
    answer['1'] = answer['2']

    return answer as AnswerV1
  })

  return answersV1
}
