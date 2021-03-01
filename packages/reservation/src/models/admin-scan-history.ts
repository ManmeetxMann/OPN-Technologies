import {TestTypes} from './appointment'

export type AdminScanHistory = {
  id: string
  createdBy: string
  type: TestTypes
  appointmentId: string
}
