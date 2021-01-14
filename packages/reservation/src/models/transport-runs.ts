import {firestore} from 'firebase-admin'
import moment from 'moment-timezone'

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
  transportDateTime: moment(transportRun.transportDateTime).utc().format(),
  driverName: transportRun.driverName,
})
