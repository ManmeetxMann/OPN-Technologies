import {ResultTypes} from './appointment'
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
  timestamps?: {
    createdAt: Timestamp
  }
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

export const mapTemperatureStatusToResultTypes = (status: TemperatureStatuses): ResultTypes => {
  const mapper = {
    [TemperatureStatuses.Proceed]: ResultTypes.Negative,
    [TemperatureStatuses.Stop]: ResultTypes.Positive,
  }

  return mapper[status]
}
