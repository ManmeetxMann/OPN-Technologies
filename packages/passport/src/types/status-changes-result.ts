import {PassportStatus} from '../models/passport'
import {AttestationAnswers} from '../models/attestation'
import {ExposureReport} from '../../../access/src/models/trace'

export type ExposureResult = {
  userId: string
  date: string
  duration: number
  exposures: ExposureReport[]
}

export type StatusChangesResult = {
  statusChanges: PassportStatus[]
  answersForFailure: AttestationAnswers[]
  exposures: ExposureResult[]
}
