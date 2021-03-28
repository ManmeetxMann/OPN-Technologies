import {Timestamp} from '../../../common/src/types/timestamp'

export type PulseOxygen = {
  pulse: number
  oxygen: number
  organizationId: string
  locationId: string
  userId: string
  status: PulseOxygenStatuses
}

export type PulseOxygenDBModel = PulseOxygen & {
  id: string
  timestamps?: Timestamp
}

export enum PulseOxygenStatuses {
  Passed = 'Passed',
  Failed = 'Failed',
}
