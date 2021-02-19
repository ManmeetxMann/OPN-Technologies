import {PassportStatus, PassportStatuses} from './passport'
import DataModel from '../../../common/src/data/datamodel.base'
import {ResultTypes} from '../../../reservation/src/models/appointment'

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

export const mapAttestationStatusToResultTypes = (status: PassportStatus): ResultTypes => {
  const mapper = {
    [PassportStatuses.TemperatureCheckRequired]: ResultTypes.Positive,
    [PassportStatuses.Pending]: ResultTypes.PresumptivePositive,
    [PassportStatuses.Proceed]: ResultTypes.Negative,
    [PassportStatuses.Caution]: ResultTypes.Invalid,
    [PassportStatuses.Stop]: ResultTypes.Positive,
  }

  return mapper[status]
}
