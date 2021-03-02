import {firestore} from 'firebase-admin'

export type TestKitBatch = {
  id: string
  lotNumber: string
  hardwareName: string
  expiry: firestore.Timestamp
  manufacturer: string
  createdBy: string
}

export type TestKitBatchPostRequest = Omit<TestKitBatch, 'id' | 'createdBy'>

export type TestKitBatchID = Pick<TestKitBatch, 'id'>
