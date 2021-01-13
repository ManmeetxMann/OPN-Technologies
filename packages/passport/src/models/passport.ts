import DataModel from '../../../common/src/data/datamodel.base'

export type Passport = {
  id: string
  userId: string
  organizationId: string
  statusToken: string
  status: PassportStatus
  validFrom: string
  validUntil: string
  dependantIds: string[]
  parentUserId?: string
  includesGuardian: boolean
}

export type PassportStatus =
  | 'pending'
  | 'proceed'
  | 'caution'
  | 'stop'
  | 'temperature_check_required'

export enum PassportStatuses {
  Pending = 'pending',
  Proceed = 'proceed',
  Caution = 'caution',
  Stop = 'stop',
  TemperatureCheckRequired = 'temperature_check_required',
}

export class PassportModel extends DataModel<Passport> {
  public readonly rootPath = 'passports'
  readonly zeroSet = []
}
