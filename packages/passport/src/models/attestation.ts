import {PassportStatus} from './passport'
import DataModel from '../../../common/src/data/datamodel.base'

export type AttestationAnswers = Record<number, Record<number, boolean | string>>
type AnswerV1 = [boolean] | [boolean, string]
export type AttestationAnswersV1 = AnswerV1[]

export type Attestation = {
  id: string
  answers: AttestationAnswers
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
