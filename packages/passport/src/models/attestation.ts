import {PassportStatus} from './passport'
import DataModel from '../../../common/src/data/datamodel.base'

export type AttestationAnswers = Record<number, Record<number, boolean | string>>

export type Attestation = {
  id: string
  answers: AttestationAnswers
  userId: string
  // userIds and dependantIds, easier to query this way
  appliesTo: string[]
  locationId: string
  attestationTime: string
  status: PassportStatus
}

export class AttestationModel extends DataModel<Attestation> {
  public readonly rootPath = 'attestations'
  readonly zeroSet = []
}
