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
