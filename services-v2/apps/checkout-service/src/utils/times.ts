import {firestore} from 'firebase-admin'

export const toFormattedIso = (time: string): string => new Date(time).toISOString()
export const timestampToFormattedIso = (time: firestore.Timestamp): string =>
  time.toDate().toISOString()
