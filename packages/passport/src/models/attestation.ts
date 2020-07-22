import {PassportStatus} from './passport'
import DataModel from '../../../common/src/data/datamodel.base'

export type Attestation = {
  id: string
  answers: Record<number, Record<number, boolean>>
  locationId: string
  attestationTime: string
  status: PassportStatus
}

export class AttestationModel extends DataModel<Attestation> {
  public readonly rootPath = 'attestations'
  readonly zeroSet = []
}
