import {firestore} from 'firebase-admin'

export type Auditable<T extends number | Date | string = Date> = {
  timestamps: {
    // TODO to be flatten
    createdAt: firestore.Timestamp
    updatedAt: firestore.Timestamp
  }
  updatedBy: string //TODO: handle with authenticated userId
}
