import {firestore} from 'firebase-admin'

export type TestKitBatch = {
  id: string
  lotNumber: string
  hardwareName: string
  expiry: firestore.Timestamp
  manufacturer: string
  createdBy: string
  timestamps?: unknown
}

export type TestKitBatchPostRequest = Omit<TestKitBatch, 'id' | 'timestamps'>

export type TestKitBatchID = Pick<TestKitBatch, 'id'>
