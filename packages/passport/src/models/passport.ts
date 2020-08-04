import DataModel from '../../../common/src/data/datamodel.base'

export type Passport = {
  id: string
  userId: string
  statusToken: string
  status: PassportStatus
  validFrom: string
  validUntil: string
}

export type PassportStatus = 'pending' | 'proceed' | 'caution' | 'stop'

export enum PassportStatuses {
  Pending = 'pending',
  Proceed = 'proceed',
  Caution = 'caution',
  Stop = 'stop',
}

export class PassportModel extends DataModel<Passport> {
  public readonly rootPath = 'passports'
  readonly zeroSet = []
}
