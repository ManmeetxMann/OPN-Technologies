import DataModel from '../../../common/src/data/datamodel.base'

export type Temperature = {
  temperature: number
  organizationId: string
  locationId: string
  userId: string
  status: TemperatureStatuses
}

export type TemperatureDBModel = Temperature & {
  id: string
}

export enum TemperatureStatuses {
  Proceed = 'proceed',
  Stop = 'stop',
}

export type TemperatureSaveRequest = {
  temperature: number
  organizationId: string
  locationId: string
}

export class TemperatureModel extends DataModel<TemperatureDBModel> {
  public readonly rootPath = 'temperature'
  readonly zeroSet = []
}
