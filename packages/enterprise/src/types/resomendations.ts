import {PulseOxygenStatuses} from '../../../reservation/src/models/pulse-oxygen'

export type AddPulse = {
  userId: string
  pulse: number
  oxygen: number
  organizationId: string
  pulseId: string
  status: PulseOxygenStatuses
}
