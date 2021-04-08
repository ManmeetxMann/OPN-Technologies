import {firestore} from 'firebase-admin'
import moment from 'moment-timezone'

export type TransportRunsBase = {
  transportRunId: string
  transportDateTime: firestore.Timestamp
  driverName: string
  label: string
}

export type TransportRunsDbModel = TransportRunsBase & {
  id: string
  transportDate: string
  labId?: string
  labName?: string
  createdBy: string
}

export type TransportRunsIdentifier = {
  id: string
  transportRunId: string
}

type TransportRunsUi = {
  transportRunId: string
  transportDateTime: string
  driverName: string
  label: string
  labId: string
  labName: string
}

export const TransportRunsDTOResponse = (transportRun: TransportRunsDbModel): TransportRunsUi => ({
  transportRunId: transportRun.transportRunId,
  transportDateTime: moment(transportRun.transportDateTime.toDate()).utc().format(),
  driverName: transportRun.driverName,
  label: transportRun.label,
  labId: transportRun.labId || '',
  labName: transportRun.labName || '',
})
