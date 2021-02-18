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

export type Timestamp = {
  createdAt: {
    _seconds: number
    _nanoseconds: number
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
