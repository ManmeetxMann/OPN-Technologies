import DataModel from '../../../common/src/data/datamodel.base'

import {safeTimestamp} from '../../../common/src/utils/datetime-util'
import {now} from '../../../common/src/utils/times'

export type Passport = {
  id: string
  userId: string
  statusToken: string
  status: PassportStatus
  validFrom: string
  validUntil: string
  dependantIds: string[]
  parentUserId?: string
  includesGuardian: boolean
}

export type PassportDTO = {
  id: string
  userId: string
  statusToken: string
  status: PassportStatus
  validFrom: string
  validUntil: string
  dependantIds: string[]
  includesGuardian: boolean
  // parentUserId is deprecated
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

export const passportDTO = (passport: Passport): PassportDTO => ({
  id: passport.id,
  userId: passport.userId,
  statusToken: passport.statusToken,
  // show passports as expired (pending) if they have expired
  status: safeTimestamp(passport.validUntil) > now() ? PassportStatuses.Pending : passport.status,
  validFrom: safeTimestamp(passport.validFrom).toISOString(),
  validUntil: safeTimestamp(passport.validUntil).toISOString(),
  dependantIds: passport.dependantIds ?? [],
  includesGuardian: passport.includesGuardian,
})
