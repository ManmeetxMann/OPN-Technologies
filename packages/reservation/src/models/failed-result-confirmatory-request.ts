import {ThirdPartySyncSource} from './appointment'

export type FailedResultConfirmatoryRequest = {
  id: string
  appointmentId: string
  resultId: string
  reasons: string[]
  source: ThirdPartySyncSource
}
