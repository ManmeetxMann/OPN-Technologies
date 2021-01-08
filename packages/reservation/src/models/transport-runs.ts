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

export const TransportRunsDTOResponse = (
  transportRun: TransportRunsDbModel,
): TransportRunsBase => ({
  transportRunId: transportRun.transportRunId,
  transportDateTime: transportRun.transportDateTime,
  driverName: transportRun.driverName,
})
