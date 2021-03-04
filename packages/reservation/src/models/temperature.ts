import {Timestamp} from '../../../common/src/types/timestamp'

export type Temperature = {
  temperature: number
  organizationId: string
  locationId: string
  userId: string
  status: TemperatureStatuses
}

export type TemperatureDBModel = Temperature & {
  id: string
  timestamps?: Timestamp
}

export enum TemperatureStatuses {
  Proceed = 'proceed',
  Stop = 'stop',
}

export type TemperatureSaveRequest = {
  temperature: number
  organizationId: string
  userId: string
}

export enum TemperatureStatusesUI {
  Passed = 'Passed',
  Failed = 'Failed',
}

export const mapTemperatureStatusToResultTypes = (
  status: TemperatureStatuses,
): TemperatureStatusesUI => {
  const mapper = {
    [TemperatureStatuses.Proceed]: TemperatureStatusesUI.Passed,
    [TemperatureStatuses.Stop]: TemperatureStatusesUI.Failed,
  }

  return mapper[status]
}
