import {firestore} from 'firebase-admin'

export type Auditable = {
  timestamps: {
    // TODO to be flatten
    createdAt: firestore.Timestamp
    updatedAt: firestore.Timestamp
    migrations?: Record<string, firestore.Timestamp>
  }
  updatedBy: string //TODO: handle with authenticated userId
}
