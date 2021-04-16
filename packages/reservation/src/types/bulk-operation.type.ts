import {AppointmentDBModel, DeadlineLabel} from '../models/appointment'

export enum BulkOperationStatus {
  Success = 'Success',
  Failed = 'Failed',
}

export type BulkOperationResponse = {
  id: string
  barCode?: string
  status: BulkOperationStatus
  reason?: string
  updatedData?: AppointmentDBModel
}

export type BulkData = {
  vialLocation?: string
  transportRunId?: string
  label?: DeadlineLabel
  userId?: string
  labId?: string
}

export enum AppointmentBulkAction {
  MakeRecived = 'MakeRecived',
  AddTransportRun = 'AddTransportRun',
  AddAppointmentLabel = 'AddAppointmentLabel',
  AddLab = 'AddLab',
}
