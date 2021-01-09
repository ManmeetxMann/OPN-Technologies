import {firestore} from 'firebase-admin'

export type TransportRunsBase = {
  transportRunId: string
  transportDateTime: firestore.Timestamp
  driverName: string
}

export type TransportRunsDbModel = TransportRunsBase & {
  id: string
  transportDate: string
}

export type TransportRunsIdentifier = {
  id: string
  transportRunId: string
}

type TransportRunsUi = {
  transportRunId: string
  transportDateTime: string
  driverName: string
}

export const TransportRunsDTOResponse = (transportRun: TransportRunsDbModel): TransportRunsUi => ({
  transportRunId: transportRun.transportRunId,
  transportDateTime: transportRun.transportDateTime.hasOwnProperty('_seconds')
    ? transportRun.transportDateTime.toDate().toDateString()
    : new Date(`${transportRun.transportDateTime}`).toISOString(),
  driverName: transportRun.driverName,
})
