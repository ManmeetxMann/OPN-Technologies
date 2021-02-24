import {TestTypes} from './appointment'

export type AdminScanHistoryBase = {
  createdBy: string
  type: TestTypes
  appointmentId: string
}

export type AdminScanHistory = AdminScanHistoryBase & {
  id: string
}
