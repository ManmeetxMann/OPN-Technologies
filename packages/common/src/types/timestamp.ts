import {firestore} from 'firebase-admin'

export type Timestamp = {
  // TODO to be flatten
  createdAt: firestore.Timestamp
  updatedAt: firestore.Timestamp
  migrations?: Record<string, firestore.Timestamp>
}
