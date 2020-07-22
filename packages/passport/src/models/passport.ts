import DataModel from '../../../common/src/data/datamodel.base'
import DataStore from '../../../common/src/data/datastore'

export type Passport = {
  id: string
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
  constructor(ds: DataStore) {
    super(ds)
  }
}
