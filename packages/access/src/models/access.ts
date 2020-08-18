import {firestore} from 'firebase-admin'
export type Access = {
  token: string
  statusToken: string
  locationId: string
  createdAt: string
  enteredAt?: string
  exitAt?: string
  userId: string
  includesGuardian: boolean
  dependants: Record<
    string,
    {
      id: string
      enteredAt?: string | firestore.FieldValue
      exitAt?: string | firestore.FieldValue
    }
  >
}
